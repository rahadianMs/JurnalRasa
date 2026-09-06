import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export interface CulinaryParseResult {
  placeId: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  recommendedDishes: string[];
  estimatedPrice?: string;
  tags: string[];
  vibesOrSummary?: string;
  sourceUrl?: string;
  personalNotes?: string;
  visualCue?: string;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client with telemetry header
let geminiClient: GoogleGenAI | null = null;
let lastApiKey: string | undefined = undefined;

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  if (!geminiClient || key !== lastApiKey) {
    lastApiKey = key;
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Fallback Indonesian City Coordinates for Geocoding robustness
const INDONESIA_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  jakarta: { lat: -6.2088, lng: 106.8456 },
  "jakarta selatan": { lat: -6.2615, lng: 106.8106 },
  "jakarta pusat": { lat: -6.1805, lng: 106.8284 },
  "jakarta barat": { lat: -6.1683, lng: 106.7588 },
  "jakarta timur": { lat: -6.2250, lng: 106.9004 },
  "jakarta utara": { lat: -6.1384, lng: 106.8640 },
  bandung: { lat: -6.9175, lng: 107.6191 },
  surabaya: { lat: -7.2575, lng: 112.7521 },
  bali: { lat: -8.4095, lng: 115.1889 },
  denpasar: { lat: -8.6705, lng: 115.2126 },
  yogyakarta: { lat: -7.7956, lng: 110.3695 },
  semarang: { lat: -6.9667, lng: 110.4167 },
  medan: { lat: 3.5952, lng: 98.6722 },
  makassar: { lat: -5.1477, lng: 119.4327 },
  malang: { lat: -7.9666, lng: 112.6326 },
  bogor: { lat: -6.5971, lng: 106.8060 },
  tangerang: { lat: -6.1783, lng: 106.6319 },
  bekasi: { lat: -6.2383, lng: 106.9756 },
  depok: { lat: -6.4025, lng: 106.7942 },
};

function extractCityFromAddress(addr: string = ""): string {
  const lower = addr.toLowerCase();
  const knownCities = [
    "Jakarta Selatan",
    "Jakarta Pusat",
    "Jakarta Barat",
    "Jakarta Timur",
    "Jakarta Utara",
    "Bandung",
    "Surabaya",
    "Bali",
    "Denpasar",
    "Yogyakarta",
    "Semarang",
    "Medan",
    "Makassar",
    "Malang",
    "Bogor",
    "Tangerang",
    "Bekasi",
    "Depok",
  ];
  for (const c of knownCities) {
    if (lower.includes(c.toLowerCase())) return c;
  }
  if (lower.includes("jakarta")) return "Jakarta Selatan";
  return "";
}

// Helper to resolve shortlinks and extract TikTok / IG metadata
async function fetchSocialMetadata(url: string): Promise<{
  title?: string;
  author?: string;
  rawText?: string;
  isPhotoSlide?: boolean;
  resolvedUrl?: string;
  slideImages?: string[];
}> {
  try {
    let targetUrl = url.trim();
    // Follow redirect if shortlink like vt.tiktok.com or vm.tiktok.com or t.tiktok.com
    if (targetUrl.includes("vt.tiktok.com") || targetUrl.includes("vm.tiktok.com") || targetUrl.includes("t.tiktok.com")) {
      try {
        const res = await fetch(targetUrl, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          },
          signal: AbortSignal.timeout(5000),
        });
        if (res.url && res.url !== targetUrl) {
          targetUrl = res.url;
        }
      } catch (redirectErr) {
        console.warn("Could not follow redirect for shortlink:", redirectErr);
      }
    }

    const isPhotoSlide = targetUrl.includes("/photo/");

    if (targetUrl.includes("tiktok.com")) {
      // 1. Try TikWM endpoint for high-fidelity caption & carousel images (especially /photo/ slides)
      try {
        const tikwmRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (tikwmRes.ok) {
          const tikwmData = (await tikwmRes.json()) as {
            code?: number;
            data?: {
              title?: string;
              images?: string[];
              author?: { nickname?: string; unique_id?: string };
            };
          };
          if (tikwmData && tikwmData.code === 0 && tikwmData.data) {
            const rawTitle = tikwmData.data.title || "";
            const images = tikwmData.data.images || [];
            const author = tikwmData.data.author?.nickname || tikwmData.data.author?.unique_id || "";
            return {
              title: rawTitle,
              author,
              rawText: rawTitle,
              isPhotoSlide: isPhotoSlide || images.length > 0,
              resolvedUrl: targetUrl,
              slideImages: images,
            };
          }
        }
      } catch (tikwmErr) {
        console.warn("TikWM fetch failed, attempting oEmbed fallback:", tikwmErr);
      }

      // 2. Try public oEmbed
      try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(oembedUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = (await res.json()) as { title?: string; author_name?: string };
          const authorText = data.author_name ? `oleh @${data.author_name}` : "";
          const fullText = [data.title || "", authorText].filter(Boolean).join(" ");
          return {
            title: data.title || "",
            author: data.author_name || "",
            rawText: fullText,
            isPhotoSlide,
            resolvedUrl: targetUrl,
          };
        }
      } catch (oembedErr) {
        console.warn("TikTok oEmbed fetch failed, attempting page text extraction:", oembedErr);
      }

      // 3. Fallback: fetch page directly and extract meta tags
      try {
        const pageRes = await fetch(targetUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(4000),
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
          const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
            html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
          const raw = descMatch?.[1] || "";
          // Strictly reject generic "TikTok - Make Your Day" from becoming restaurant text!
          if (raw && !raw.toLowerCase().includes("make your day")) {
            return {
              title: titleMatch?.[1] || "",
              rawText: raw,
              isPhotoSlide,
              resolvedUrl: targetUrl,
            };
          }
        }
      } catch {}

      return {
        isPhotoSlide,
        resolvedUrl: targetUrl,
      };
    }

    // Instagram support (Reels, Posts)
    if (targetUrl.includes("instagram.com")) {
      try {
        const igRes = await fetch(targetUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          },
          signal: AbortSignal.timeout(4000),
        });
        if (igRes.ok) {
          const html = await igRes.text();
          const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i) ||
            html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
          const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i) ||
            html.match(/<title>([^<]*)<\/title>/i);
          let rawDesc = descMatch?.[1] || titleMatch?.[1] || "";
          // Clean standard Instagram prefix "1,234 likes, 40 comments - @username on Instagram: 'caption'"
          rawDesc = rawDesc.replace(/^[\d,.]+\s+likes,\s+[\d,.]+\s+comments\s*-\s*[^:]+:\s*["']?/i, "").replace(/["']$/g, "").trim();
          if (rawDesc && rawDesc !== "Instagram") {
            return {
              title: titleMatch?.[1] || "",
              rawText: rawDesc,
              resolvedUrl: targetUrl,
            };
          }
        }
      } catch (igErr) {
        console.warn("Instagram fetch failed:", igErr);
      }
    }
  } catch (err) {
    console.warn("Could not fetch social metadata directly:", err);
  }
  return {};
}

// Geocode using Google Places API if key provided, else fallback geocoding
async function geocodePlace(
  name: string,
  city: string,
  areaHint?: string
): Promise<{
  place_id: string;
  official_name?: string;
  formatted_address: string;
  lat: number;
  lng: number;
  rating: number;
}> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // Protect against searching ONLY a city name as a place or invalid keywords
  let safeSearchName = name.trim();
  if (isInvalidRestaurantName(safeSearchName) || safeSearchName.toLowerCase() === city.toLowerCase()) {
    safeSearchName = `Kuliner Pilihan ${city}`;
  }

  if (apiKey) {
    try {
      const cleanSearchName = safeSearchName.replace(/[^\w\s.,&-]/gi, " ").trim();
      const searchQuery = [cleanSearchName, areaHint, city]
        .filter(Boolean)
        .join(" ");
      const query = encodeURIComponent(searchQuery);
      const endpoint = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{
            place_id?: string;
            name?: string;
            formatted_address?: string;
            geometry?: { location?: { lat: number; lng: number } };
            rating?: number;
          }>;
        };
        if (data.results && data.results.length > 0) {
          // Exclude non-food establishments (e.g. watch repairs, laundry, electronics)
          const culinaryResult = data.results.find((r) => {
            const rName = (r.name || "").toLowerCase();
            return (
              !rName.includes("watch repair") &&
              !rName.includes("reparasi") &&
              !rName.includes("jam tangan") &&
              !rName.includes("tiktok") &&
              !rName.includes("bengkel") &&
              !rName.includes("laundry")
            );
          });
          const target = culinaryResult || data.results[0];
          const cleanOfficial = target.name && !isCityOnlyName(target.name) && !isInvalidRestaurantName(target.name)
            ? target.name
            : safeSearchName;
          return {
            place_id: target.place_id || `place_${Date.now()}`,
            official_name: cleanOfficial,
            formatted_address: target.formatted_address || `${cleanOfficial}, ${city}`,
            lat: target.geometry?.location?.lat ?? -6.2088,
            lng: target.geometry?.location?.lng ?? 106.8456,
            rating: target.rating || 4.5,
          };
        }
      }
    } catch (err) {
      console.warn("Google Places API error, using geocoding fallback:", err);
    }
  }

  // Fallback geocoding: use OpenStreetMap Nominatim or city center with deterministic slight offset
  try {
    const q = encodeURIComponent(`${safeSearchName} ${city}`);
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
    const res = await fetch(osmUrl, {
      headers: { "User-Agent": "TrendBite-Culinary-Curator/1.0" },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as Array<{
        place_id?: number;
        display_name?: string;
        lat: string;
        lon: string;
      }>;
      if (data && data.length > 0) {
        return {
          place_id: `osm_${data[0].place_id || Date.now()}`,
          official_name: safeSearchName,
          formatted_address: data[0].display_name || `${safeSearchName}, ${city}`,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          rating: 4.6,
        };
      }
    }
  } catch {
    // ignore
  }

  // City-based offset deterministic fallback
  const cityKey = city.toLowerCase();
  const matchedCity = Object.keys(INDONESIA_CITY_COORDS).find((k) => cityKey.includes(k));
  const base = matchedCity ? INDONESIA_CITY_COORDS[matchedCity] : INDONESIA_CITY_COORDS["jakarta"];

  // Deterministic slight pseudo-hash offset so markers in the same city don't stack completely
  const hash = safeSearchName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 40) - 20) * 0.0022;
  const lngOffset = (((hash * 3) % 40) - 20) * 0.0022;

  const cleanId = safeSearchName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 24);

  return {
    place_id: `tb_${cleanId}_${Date.now().toString(36)}`,
    official_name: safeSearchName,
    formatted_address: `${safeSearchName}, ${city || "Indonesia"}`,
    lat: Number((base.lat + latOffset).toFixed(5)),
    lng: Number((base.lng + lngOffset).toFixed(5)),
    rating: 4.5,
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Config endpoint for client awareness
app.get("/api/config", (req, res) => {
  res.json({
    hasMapsKey: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || "",
    status: "ok",
  });
});

// Helper to clean Indonesian restaurant / cafe name from social post text
function cleanIndonesianPlaceName(raw: string): string {
  let name = raw.trim();
  // Strip slide/number/emoji prefix
  name = name.replace(/^(?:(?:slide|foto|gambar|part)\s*\d+[:.-]?|\d+[\.\)\-:]|#\d+|\[\d+\]|📍|📌)\s*/i, "");
  
  // If there is a hyphen or dash separating name and description, take first part
  if (name.includes(" - ")) {
    name = name.split(" - ")[0];
  } else if (name.includes(" : ")) {
    name = name.split(" : ")[0];
  }

  // Strip clickbaits
  const clickbaits = [
    /\b(jujur ini enakkk*|jujur ini enak|enak bange+t+|enak parah+|viral bange+t+|wajib coba+|wajib mampir+|harus coba+|gila sih+|hidden gem+|kaget bange+t+|akhirnya nyobain+|nemu tempat+|parah sih+|ga pernah gagal+|rekomendasi tempat|spot nongkrong|creamy pedes gong+|ga nyangka|worth it bange+t+|rekomen bange+t+)\b!*/gi,
    /^(?:rekomendasi|spot|tempat|kuliner|hidden gem|menu)\s+/i,
  ];
  for (const cb of clickbaits) {
    name = name.replace(cb, " ");
  }

  // Remove trailing social markers
  name = name.replace(/[@#*!]/g, "").replace(/\s+/g, " ").trim();
  return name;
}

// City names set to prevent false restaurant names
const INDONESIA_CITIES_SET = new Set([
  "jakarta", "jakarta selatan", "jakarta pusat", "jakarta barat", "jakarta timur", "jakarta utara",
  "jaksel", "jakpus", "jakbar", "jaktim", "jakut",
  "bandung", "surabaya", "bali", "denpasar", "yogyakarta", "jogja", "semarang", "medan", "makassar",
  "malang", "bogor", "tangerang", "tangsel", "bekasi", "depok", "solo", "surakarta", "palembang", "padang"
]);

function isCityOnlyName(name: string): boolean {
  if (!name) return true;
  const clean = name.trim().toLowerCase().replace(/[^a-z\s]/g, "").trim();
  return INDONESIA_CITIES_SET.has(clean);
}

const INVALID_RESTAURANT_KEYWORDS = [
  "tiktok",
  "tik-tok",
  "tik tok",
  "watch repair",
  "reparasi jam",
  "instagram",
  "reels",
  "make your day",
  "makeyourday",
  "foryou",
  "foryoupage",
  "fyp",
  "video",
  "photo",
  "carousel",
  "ojol",
  "makanan anak kos",
  "anak kosan",
  "comfort food",
];

function isInvalidRestaurantName(name: string): boolean {
  if (!name) return true;
  const lower = name.toLowerCase().trim();
  if (lower.length < 3) return true;
  if (isCityOnlyName(name)) return true;
  for (const kw of INVALID_RESTAURANT_KEYWORDS) {
    if (lower === kw || lower.includes(kw)) {
      return true;
    }
  }
  return false;
}

// Detect city from text with Indonesian location dictionary
const INDONESIA_CITY_MAP = [
  {
    name: "Jakarta Selatan",
    patterns: ["jakarta selatan", "jaksel", "blok m", "melawai", "senopati", "kemang", "tebet", "cilandak", "pondok indah", "pasar minggu", "mahakam", "gandaria", "haraku", "fatmawati"],
  },
  {
    name: "Jakarta Pusat",
    patterns: ["jakarta pusat", "jakpus", "menteng", "sabang", "tanah abang", "monas", "pasar baru", "grand indonesia", "thamrin"],
  },
  {
    name: "Jakarta Barat",
    patterns: ["jakarta barat", "jakbar", "mangga besar", "tanjung duren", "puri", "kebon jeruk"],
  },
  {
    name: "Jakarta Timur",
    patterns: ["jakarta timur", "jaktim", "rawamangun", "matraman", "jatinegara"],
  },
  {
    name: "Jakarta Utara",
    patterns: ["jakarta utara", "jakut", "kelapa gading", "pik", "pantai indah kapuk", "pluit", "sunter"],
  },
  {
    name: "Bandung",
    patterns: ["bandung", "cihapit", "braga", "dago", "riau bandung", "purwakarta", "lembang", "gedung sate", "lodaya", "lengkong", "progo", "hasanudin", "anggrek", "serayu"],
  },
  {
    name: "Surabaya",
    patterns: ["surabaya", "gubeng", "tunjungan", "dharmahusada", "kaliasin", "sinjay"],
  },
  {
    name: "Bali",
    patterns: ["bali", "denpasar", "seminyak", "canggu", "ubud", "sanur", "kuta", "legian", "mak beng"],
  },
  {
    name: "Yogyakarta",
    patterns: ["yogyakarta", "jogja", "malioboro", "prawirotaman", "kaliurang", "kranggan", "wijilan", "yu djum"],
  },
  {
    name: "Bogor",
    patterns: ["bogor", "surken", "suryakencana", "pajajaran", "sentul"],
  },
  {
    name: "Semarang",
    patterns: ["semarang", "simpang lima", "pandanaran", "kota lama"],
  },
  {
    name: "Medan",
    patterns: ["medan", "kesawan", "selat panjang"],
  },
  {
    name: "Makassar",
    patterns: ["makassar", "losari"],
  },
  {
    name: "Malang",
    patterns: ["malang", "batu"],
  },
];

function detectIndonesianCity(text: string, defaultCity = "Jakarta Selatan"): string {
  const lower = text.toLowerCase();
  for (const item of INDONESIA_CITY_MAP) {
    if (item.patterns.some((p) => lower.includes(p))) {
      return item.name;
    }
  }
  return defaultCity;
}

// Segments a multi-slide or recap post into individual place descriptions
function segmentRecapOrSlidePost(text: string): {
  contextCity: string;
  items: string[];
} {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rawSegments: string[] = [];
  let currentHeader = "";
  let currentLines: string[] = [];

  const itemHeaderRegex = /^(?:(?:slide|foto|gambar|part)\s*\d+[:.-]?|\d+[\.\)\-:]|#\d+|\[\d+\]|📍|📌)\s*/i;

  for (const line of lines) {
    if (itemHeaderRegex.test(line)) {
      if (currentLines.length > 0) {
        rawSegments.push(currentLines.join("\n"));
        currentLines = [];
      }
      currentLines.push(line);
    } else {
      if (currentLines.length > 0) {
        currentLines.push(line);
      } else {
        currentHeader += (currentHeader ? " " : "") + line;
      }
    }
  }

  if (currentLines.length > 0) {
    rawSegments.push(currentLines.join("\n"));
  }

  // Detect context city from the intro header if any
  const contextCity = detectIndonesianCity(currentHeader || text, "Jakarta Selatan");

  // Filter out intro slides (e.g. "Slide 1: 4 Rekomendasi Kuliner Jaksel")
  const items = rawSegments.filter((seg) => {
    const t = seg.toLowerCase().replace(/^(?:slide|foto|gambar|part)\s*\d+[:.-]?\s*/i, "").trim();
    if (/(?:rekomendasi|kumpulan|top|deretan|list)\s+\d+/i.test(t)) return false;
    if (/^\d+\s+(?:rekomendasi|spot|tempat|kuliner)/i.test(t)) return false;
    if (/^(?:save dulu|wajib save|part\s*\d+|edisi\s*kuliner)/i.test(t)) return false;
    return true;
  });

  // If items are empty or 1, check for narrative recap indicators in prose
  // e.g. "Dari mulai sarapan soft sourdough, makan bebek kukus pertama di Bandung, sampe ngebakso"
  if (items.length <= 1) {
    const narrativeRegex = /(?:dari mulai|mulai dari|sarapan|makan siang|makan malem|siang|malem|sampe|hingga|lanjut ke|terus ke|nyobain|cobain)\s+([^,.\n!]+)/gi;
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = narrativeRegex.exec(text)) !== null) {
      const seg = match[0].trim();
      if (seg.length > 5 && !matches.includes(seg)) {
        matches.push(seg);
      }
    }
    if (matches.length >= 2) {
      return { contextCity, items: matches };
    }
  }

  return { contextCity, items };
}

// Heuristic Indonesian culinary parser for single place
function extractCulinaryHeuristics(
  text: string,
  url: string = "",
  notes: string = "",
  fallbackCity = "Jakarta Selatan"
): {
  restaurant_name: string;
  city: string;
  must_try_dishes: string[];
  estimated_price: string;
  tags: string[];
  vibes_or_summary: string;
} {
  const combined = `${text || ""} ${url || ""} ${notes || ""}`;
  const lower = combined.toLowerCase();

  // 1. City Detection
  const detectedCity = detectIndonesianCity(combined, fallbackCity);

  // 2. Intelligent Restaurant Name Detection
  let restaurantName = "";

  // Check 2a: Mentions like @Haraku Ramen Halal, @KopiTokoDjawa, etc.
  const mentions = text.match(/@([a-zA-Z0-9_.\s]+?)(?=\s*[#\n,!]|$)/g) || [];
  for (const m of mentions) {
    const cleanMention = m.replace("@", "").trim();
    const isCulinaryVenue = /ramen|kopi|coffee|cafe|resto|restoran|warung|kedai|bakso|sate|mie|ayam|bebek|gultik|claypot|kitchen|dapur|grill|bbq|steak|sushi|dimsum|martabak|haraku|donut/i.test(cleanMention);
    if (isCulinaryVenue && !isCityOnlyName(cleanMention)) {
      restaurantName = cleanMention.replace(/\s+(halal|official|indonesia|id|jkt)$/i, "").trim();
      break;
    }
  }

  // Check 2b: Cleaned place name from line or header
  if (!restaurantName) {
    const cleaned = cleanIndonesianPlaceName(text);
    if (
      cleaned &&
      cleaned.length > 2 &&
      cleaned.length < 40 &&
      !isCityOnlyName(cleaned) &&
      !/enak|viral|murah|banget|parah|jujur/i.test(cleaned)
    ) {
      restaurantName = cleaned;
    }
  }

  // Check 2c: Hashtags like #harakuramen, #claypotpopo, #gultikblokm
  if (!restaurantName) {
    const hashtags = (text.match(/#(\w+)/g) || []).map((h) => h.replace("#", ""));
    for (const tag of hashtags) {
      const tagLower = tag.toLowerCase();
      if (isCityOnlyName(tagLower)) continue;
      if (tagLower === "harakuramen" || tagLower.includes("haraku")) {
        restaurantName = "Haraku Ramen";
        break;
      } else if (tagLower === "gultikblokm" || tagLower === "gultik") {
        restaurantName = "Gultik Blok M";
        break;
      } else if (tagLower === "claypotpopo" || tagLower.includes("claypot")) {
        restaurantName = "Claypot Popo Melawai";
        break;
      } else if (tagLower === "satemaranggi" || tagLower.includes("maranggi")) {
        restaurantName = "Sate Maranggi Hj. Yetty";
        break;
      } else if (tagLower === "warungmakbeng" || tagLower.includes("makbeng")) {
        restaurantName = "Warung Mak Beng";
        break;
      } else if (tagLower === "bebeksinjay" || tagLower.includes("sinjay")) {
        restaurantName = "Bebek Sinjay";
        break;
      } else if (tagLower.includes("ramen")) {
        restaurantName = tag.replace(/ramen/i, " Ramen").trim();
        break;
      }
    }
  }

  // Check 2d: Known famous culinary spots
  if (!restaurantName) {
    if (lower.includes("haraku ramen") || lower.includes("haraku")) {
      restaurantName = "Haraku Ramen";
    } else if (lower.includes("gultik")) {
      restaurantName = "Gultik Blok M";
    } else if (lower.includes("claypot popo") || lower.includes("claypot")) {
      restaurantName = "Claypot Popo Melawai";
    } else if (lower.includes("sate maranggi") || lower.includes("maranggi")) {
      restaurantName = "Sate Maranggi Hj. Yetty";
    } else if (lower.includes("mak beng")) {
      restaurantName = "Warung Mak Beng";
    } else if (lower.includes("toko djawa")) {
      restaurantName = "Kopi Toko Djawa";
    } else if (lower.includes("bebek sinjay") || lower.includes("sinjay")) {
      restaurantName = "Bebek Sinjay";
    } else if (lower.includes("kebon sirih")) {
      restaurantName = "Nasi Goreng Kambing Kebon Sirih";
    } else if (lower.includes("yu djum") || lower.includes("yudjum")) {
      restaurantName = "Gudeg Yu Djum";
    }
  }

  // Check 2e: Prefixes like "di [Name]", "ke [Name]"
  if (!restaurantName) {
    const cleanedText = cleanIndonesianPlaceName(text);
    const prefixMatch = cleanedText.match(/(?:di|ke|mampir ke|nyobain|cobain|lokasi:?)\s+([A-Z][a-zA-Z0-9\s]{2,30}?)(?=[,.\n!#]|\s+di\b|\s+yang\b|$)/i);
    if (prefixMatch && prefixMatch[1]) {
      const candidate = prefixMatch[1].trim();
      if (!/enak|viral|murah|banget|parah|jujur/i.test(candidate) && !isCityOnlyName(candidate)) {
        restaurantName = candidate;
      }
    }

    if (!restaurantName) {
      const segments = cleanedText.split(/[\n,!.?:-]/).map((s) => s.trim()).filter((s) => s.length > 2);
      for (const seg of segments) {
        if (!/enak|viral|banget|wajib|harus|jujur|parah|sih|gong/i.test(seg) && seg.length < 35 && !isCityOnlyName(seg)) {
          restaurantName = seg.replace(/[#@*]/g, "").trim();
          break;
        }
      }
    }
  }

  // Fallback if still generic, city name, or invalid keyword
  if (
    !restaurantName ||
    isCityOnlyName(restaurantName) ||
    isInvalidRestaurantName(restaurantName) ||
    restaurantName.toLowerCase() === detectedCity.toLowerCase()
  ) {
    if (lower.includes("sourdough")) {
      restaurantName = `Soft Sourdough Cafe ${detectedCity}`;
    } else if (lower.includes("bebek")) {
      restaurantName = detectedCity === "Bandung" ? "Bebek Waluya (Bebek Kukus)" : `Bebek Kukus ${detectedCity}`;
    } else if (lower.includes("bakso")) {
      restaurantName = `Bakso Sapi ${detectedCity}`;
    } else if (lower.includes("kopi") || lower.includes("coffee")) {
      restaurantName = `Kedai Kopi ${detectedCity}`;
    } else {
      restaurantName = `Kuliner Pilihan ${detectedCity}`;
    }
  }

  // 3. Must-Try Dishes Extraction
  const dishes: string[] = [];

  // Hashtag dishes detection (e.g. #creamybararamen)
  const hashtags = (text.match(/#(\w+)/g) || []).map((h) => h.replace("#", "").toLowerCase());
  for (const h of hashtags) {
    if (h === "creamybararamen") {
      dishes.push("Creamy BARA Ramen");
    } else if (h.includes("ramen") && h !== "harakuramen") {
      dishes.push(h.replace(/ramen/g, " Ramen").trim());
    }
  }

  const nameLower = restaurantName.toLowerCase();
  if (lower.includes("ramen") || nameLower.includes("ramen")) {
    if (!dishes.some((d) => d.toLowerCase().includes("creamy"))) {
      if (lower.includes("creamy") || lower.includes("pedes") || lower.includes("bara")) {
        dishes.push("Creamy BARA Ramen");
      }
    }
    if (!dishes.some((d) => d.toLowerCase().includes("paitan"))) {
      dishes.push("Tori Paitan Ramen");
    }
    dishes.push("Karaage & Tempura");
  } else if (lower.includes("gulai") || lower.includes("gultik") || nameLower.includes("gultik")) {
    dishes.push("Gulai Sapi Campur Urat", "Kerupuk Kulit Kuah Gulai");
  } else if (lower.includes("claypot") || nameLower.includes("claypot")) {
    dishes.push("Claypot Siram Telur Mentah", "Claypot Misua Tahu Telur Asin");
  } else if (lower.includes("dimsum") || nameLower.includes("dimsum") || nameLower.includes("haka")) {
    dishes.push("Siomay Udang Steamed", "Hakau Udang Kulit Transparan", "Onde-Onde Telur Asin");
  } else if (lower.includes("donut") || nameLower.includes("donut")) {
    dishes.push("Donat Kentang Klasik Gula Halus", "Donat Coklat Melted");
  } else if (lower.includes("sate") || nameLower.includes("sate")) {
    dishes.push("Sate Sapi & Kambing Maranggi", "Sambal Tomat Pedas Segar", "Ketan Bakar Gurih");
  } else if (lower.includes("kopi") || lower.includes("cafe")) {
    dishes.push("Es Kopi Awan", "Donat Coklat Klasik");
  } else if (lower.includes("ikan") || lower.includes("seafood") || nameLower.includes("beng")) {
    dishes.push("Ikan Goreng Crispy Bumbu Kuning", "Sup Kepala Ikan Pedas Segar");
  } else if (lower.includes("bebek") || nameLower.includes("sinjay")) {
    dishes.push("Bebek Goreng Kremes", "Sambal Pencit Mangga Muda");
  } else if (lower.includes("gudeg") || nameLower.includes("yu djum")) {
    dishes.push("Nasi Gudeg Kering Komplit", "Sambal Goreng Krecek Pedas");
  } else if (lower.includes("cuanki") || lower.includes("serayu")) {
    dishes.push("Cuanki Kuah Kaldu Gurih", "Batagor Renyah Bumbu Kacang");
  } else if (lower.includes("bakso")) {
    dishes.push("Bakso Urat Spesial", "Pangsit Goreng Renyah");
  } else if (lower.includes("mie") || lower.includes("gacoan")) {
    dishes.push("Mie Pedas Manis", "Pangsit Goreng Crispy");
  }

  if (dishes.length === 0) {
    dishes.push("Menu Spesial Rekomendasi", "Minuman Segar");
  }

  // 4. Estimated Price
  let estimatedPrice = "Rp 25.000 - Rp 50.000";
  if (lower.includes("ramen") || nameLower.includes("ramen")) {
    estimatedPrice = "Rp 35.000 - Rp 65.000";
  } else if (lower.includes("gultik")) {
    estimatedPrice = "Rp 15.000 - Rp 30.000";
  } else if (lower.includes("claypot")) {
    estimatedPrice = "Rp 40.000 - Rp 65.000";
  } else if (lower.includes("donut")) {
    estimatedPrice = "Rp 12.000 - Rp 25.000";
  }

  const priceMatch = text.match(/(?:rp\.?\s*|cuma\s*|harga\s*)(\d{1,3}(?:\.\d{3})*|\d+)\s*(?:rb|k|ribu)?/i);
  if (priceMatch) {
    const rawDigits = priceMatch[1].replace(/\./g, "");
    const num = parseInt(rawDigits, 10);
    if (num < 500) {
      estimatedPrice = `Rp ${num}.000 / porsi`;
    } else if (num >= 1000) {
      estimatedPrice = `Rp ${num.toLocaleString("id-ID")} / porsi`;
    }
  }

  // 5. Tags
  const tags: string[] = ["Viral TikTok", "Rekomendasi Warga"];
  if (lower.includes("halal") || lower.includes("sapi") || lower.includes("ayam") || nameLower.includes("ramen")) tags.push("Halal");
  if (lower.includes("ramen") || nameLower.includes("ramen")) {
    tags.push("Ramen", "Jepang");
  }
  if (lower.includes("streetfood") || lower.includes("trotoar") || lower.includes("kaki lima") || lower.includes("gultik")) {
    tags.push("Street Food");
  }
  if (lower.includes("dimsum") || nameLower.includes("dimsum")) tags.push("Dimsum", "Chinese Food");
  if (lower.includes("cafe") || lower.includes("kopi") || lower.includes("vintage")) tags.push("Cafe");
  if (lower.includes("donut") || lower.includes("dessert") || lower.includes("manis")) tags.push("Dessert", "Pastry");
  if (lower.includes("pedas") || lower.includes("sambal") || lower.includes("bara")) tags.push("Pedas");
  if (lower.includes("malam") || lower.includes("02.00") || lower.includes("subuh") || lower.includes("24 jam")) tags.push("Kuliner Malam");
  if (lower.includes("vintage") || lower.includes("hidden") || lower.includes("gang")) tags.push("Hidden Gem");

  const vibes = `Tempat kuliner viral di ${detectedCity} dengan menu andalan ${dishes[0]}, suasana autentik yang banyak direkomendasikan foodies.`;

  return {
    restaurant_name: restaurantName,
    city: detectedCity,
    must_try_dishes: Array.from(new Set(dishes)),
    estimated_price: estimatedPrice,
    tags: Array.from(new Set(tags)),
    vibes_or_summary: vibes,
  };
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Google Maps config endpoint
app.get("/api/config/maps", (req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";
  res.json({ apiKey });
});

// Endpoint: Parse Link or Caption with Gemini AI / Smart Recaps (multi-slide & multi-place capable)
app.post("/api/parse-link", async (req, res) => {
  try {
    const { url = "", caption = "", personalNotes = "" } = req.body;

    let textToAnalyze = caption?.trim() || "";
    let extractedMetadata: {
      title?: string;
      author?: string;
      rawText?: string;
      isPhotoSlide?: boolean;
      resolvedUrl?: string;
      slideImages?: string[];
    } = {};

    if (url && !textToAnalyze) {
      extractedMetadata = await fetchSocialMetadata(url);
      textToAnalyze = extractedMetadata.rawText || extractedMetadata.title || "";
    }

    // If still no text could be extracted from the URL, prompt for manual caption
    if (!textToAnalyze) {
      return res.json({
        success: false,
        needManualCaption: true,
        isPhotoSlide: Boolean(extractedMetadata.isPhotoSlide),
        message: extractedMetadata.isPhotoSlide
          ? "Postingan ini adalah Carousel Foto TikTok! Silakan tempel caption, deskripsi, atau daftar tempat di slide foto pada kolom di bawah."
          : "URL media sosial terhalang proteksi bot/CAPTCHA. Silakan tempel caption, komentar, atau deskripsi video kuliner secara manual di bawah.",
      });
    }

    let extractedList: Array<{
      raw_visual_cue?: string;
      restaurant_name: string;
      city: string;
      area_hint?: string;
      must_try_dishes: string[];
      estimated_price?: string;
      tags: string[];
      vibes_or_summary?: string;
    }> = [];

    let isAIGenerated = false;
    let fallbackNotice = "";
    let recordedReasoningStep: {
      visualCues?: string[];
      locationReasoning?: string;
    } | undefined = undefined;

    // 1. Attempt with Gemini AI if client is configured (with multi-model fallback)
    const ai = getGeminiClient();
    if (ai) {
      const systemInstruction = `Kamu adalah pakar kurator kuliner Indonesia TrendBite dan analisis media sosial (TikTok & Instagram).
Tugasmu adalah menganalisis postingan TikTok/Instagram (video cerita, photo carousel, atau video recap / food tour) dan mengekstrak SEMUA tempat makan ke dalam JSON.

MANDATORY CHAIN-OF-THOUGHT / REASONING STEP (WAJIB DILAKUKAN SEBELUM PEMETAAN KE TEMPAT MAKAN):
Sebelum menentukan nama tempat makan dan memetakannya ke Google Places API, model WAJIB menjalankan tahap penalaran ("reasoning_step"):
1. "visual_cues_and_clues": Telusuri dan buat daftar SEMUA petunjuk visual nyata yang ditemukan pada gambar slide foto / video / teks. Contohnya: teks stiker kemasan makanan, logo brand kuliner, kartu nama / kartu ucapan, plang nama toko / neon sign toko, judul slide, cap kemasan, atau teks menu di foto.
2. "location_reasoning": Lakukan analisis penalaran lokasi secara bertahap (step-by-step reasoning):
   - Bedakan dengan tegas antara nama brand/tempat makan konkret vs nama kota administratif atau istilah umum.
   - Singkirkan istilah umum atau platform (misal: "TikTok", "Instagram", "GoFood", "GrabFood", "Ojol", "Anak Kos", "Comfort Food", "Watch Repair", "Make Your Day").
   - ATURAN MUTLAK: JANGAN PERNAH menyimpulkan nama kota administratif umum (seperti "Jakarta", "Jakarta Selatan", "Bandung", "Surabaya", "Bali") sebagai 'restaurant_name'! Nama kota hanya boleh diisikan ke field 'city'.
   - Jika suatu tempat makan di slide/video belum memiliki brand formal, buat nama kuliner deskriptif spesifik berdasarkan makanannya (contoh: "Soft Sourdough Bakery Bandung", "Bebek Bumbu Hitam Kemang"), BUKAN hanya kata kota!
3. Baru setelah mengevaluasi petunjuk visual di atas, turunkan daftar tempat makan konkret ('places') lengkap dengan 'raw_visual_cue' sumbernya agar siap dipetakan secara akurat ke alamat resmi Google Places API.

ATURAN EKSTRAKSI TEMPAT (PLACES):
1. Multi-Place / Carousel / Food Tour: Jika postingan memuat beberapa slide atau beberapa tempat makan berbeda, pisahkan SETIAP tempat makan unik menjadi item tersendiri di dalam array 'places'.
2. Sertakan 'raw_visual_cue' pada setiap tempat makan untuk mencatat petunjuk visual/bukti tekstual asalnya.
3. Tentukan kota (city) dengan benar (misal: "Jakarta Selatan", "Jakarta Barat", "Jakarta Pusat", "Bandung", dll).
4. must_try_dishes: Menu makanan / minuman spesifik yang direkomendasikan.
5. estimated_price: Estimasi harga per orang (contoh: "Rp 25.000 - Rp 50.000").
6. tags: Tag kuliner yang relevan (misal: ["Ayam Geprek", "Dimsum", "Viral TikTok", "Halal"]).
7. vibes_or_summary: Ringkasan singkat daya tarik tempat tersebut.`;

      const prompt = `Analisis konten kuliner berikut dengan TAHAP PENALARAN WAJIB (MANDATORY REASONING STEP):
URL Sumber: ${url || "N/A"}
Teks / Caption Video / Slide:
"""
${textToAnalyze}
"""
Catatan Tambahan: ${personalNotes || "Tidak ada"}

INSTRUKSI TAHAP PENALARAN (REASONING STEP):
1. LANGKAH 1 (Daftar Petunjuk Visual): Daftarkan semua petunjuk visual eksplisit yang terlihat pada gambar/teks (misal: teks stiker kemasan, logo, kartu ucapan/nama, spanduk, judul slide) di 'reasoning_step.visual_cues_and_clues'.
2. LANGKAH 2 (Penalaran Lokasi & Anti-Kota Generik): Di 'reasoning_step.location_reasoning', uraikan penalaran logis untuk mengidentifikasi setiap nama tempat makan spesifik. Pastikan nama kota seperti 'Jakarta' atau 'Bandung' tidak pernah dijadikan nama tempat makan.
3. LANGKAH 3 (Daftar Tempat): Sajikan daftar tempat kuliner ('places') terverifikasi dengan 'raw_visual_cue' yang mendasarinya agar sistem dapat memetakannya secara presisi ke Google Places API.`;

      // If this post contains slide images (e.g. photo carousel), pass all images to Gemini multimodal
      let contentsPayload: any = prompt;
      if (extractedMetadata.slideImages && extractedMetadata.slideImages.length > 0) {
        try {
          const targetImages = extractedMetadata.slideImages.slice(0, 35);
          const fetchPromises = targetImages.map(async (imgUrl) => {
            try {
              const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(5000) });
              if (imgRes.ok) {
                const buf = await imgRes.arrayBuffer();
                return {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: Buffer.from(buf).toString("base64"),
                  },
                };
              }
            } catch {}
            return null;
          });

          const fetchedResults = await Promise.all(fetchPromises);
          const imageParts = fetchedResults.filter(
            (r): r is { inlineData: { mimeType: string; data: string } } => r !== null
          );

          if (imageParts.length > 0) {
            const visualPrompt = `${prompt}

PANDUAN EKSTRAKSI SLIDE FOTO CAROUSEL (${imageParts.length} GAMBAR SLIDE):
1. Telusuri SELURUH slide gambar dari slide 1 sampai slide terakhir (${imageParts.length}) secara tuntas.
2. Setiap slide yang memperlihatkan rekomendasi tempat makan, resto, kedai, warung, atau menu makanan berbeda HARUS diekstrak sebagai satu entitas tempat makan di dalam array 'places'.
3. BACA teks grafis, nama restoran/brand yang tertera pada kemasan, stiker, kartu ucapan, atau judul slide foto (contoh: Ayam Gebyok Bang Jarwo, Aburi Kitchen, Secbowl / SB, Martabak Idola 2, Bebek Carok, Pisang Goreng Waras, Warung Jegeg, Dimsum Andria, Sushi Mate, Taichan Bang Yoyo, Nasgero, Bakmie Alung, Taichan Mampang, Ayam Blenger PSP, Naskun Bangka, dll).
4. Masukkan SEMUA tempat makan unik yang ada di seluruh slide. JANGAN sampai ada tempat yang terlewat!`;
            contentsPayload = [
              {
                role: "user",
                parts: [...imageParts, { text: visualPrompt }],
              },
            ];
          }
        } catch (imgErr) {
          console.warn("Could not download slide images for multimodal analysis:", imgErr);
        }
      }

      // Model candidate list in priority order
      const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contentsPayload,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  reasoning_step: {
                    type: Type.OBJECT,
                    properties: {
                      visual_cues_and_clues: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description:
                          "Daftar seluruh petunjuk visual mentah (teks kemasan, stiker, logo brand, kartu nama/ucapan, plang/neon sign, caption, judul slide) yang menunjukkan lokasi atau makanan.",
                      },
                      location_reasoning: {
                        type: Type.STRING,
                        description:
                          "Penalaran bertahap mengidentifikasi brand/nama restoran konkret dari petunjuk visual, menyaring kata platform/istilah umum, dan mencegah nama kota dijadikan nama tempat makan.",
                      },
                    },
                    required: ["visual_cues_and_clues", "location_reasoning"],
                  },
                  is_multi_place: { type: Type.BOOLEAN },
                  places: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        raw_visual_cue: {
                          type: Type.STRING,
                          description:
                            "Petunjuk visual atau teks spesifik yang menjadi bukti identifikasi tempat ini.",
                        },
                        restaurant_name: {
                          type: Type.STRING,
                          description:
                            "Nama resmi/spesifik tempat makan. Dilarang keras hanya berupa nama kota umum!",
                        },
                        city: { type: Type.STRING },
                        area_hint: { type: Type.STRING },
                        must_try_dishes: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        estimated_price: { type: Type.STRING },
                        tags: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        vibes_or_summary: { type: Type.STRING },
                      },
                      required: ["restaurant_name", "city", "must_try_dishes", "tags"],
                    },
                  },
                },
                required: ["reasoning_step", "places"],
              },
            },
          });

          const parsedJsonText = response.text?.trim();
          if (parsedJsonText) {
            const parsed = JSON.parse(parsedJsonText);
            if (parsed && Array.isArray(parsed.places) && parsed.places.length > 0) {
              const validPlaces = parsed.places.filter(
                (p: any) => p && p.restaurant_name && !isInvalidRestaurantName(p.restaurant_name)
              );
              if (validPlaces.length > 0) {
                extractedList = validPlaces;
                if (parsed.reasoning_step) {
                  recordedReasoningStep = {
                    visualCues: parsed.reasoning_step.visual_cues_and_clues,
                    locationReasoning: parsed.reasoning_step.location_reasoning,
                  };
                  console.log(
                    `[Gemini Reasoning Step] Found ${recordedReasoningStep.visualCues?.length || 0} visual cues. Reasoning: ${recordedReasoningStep.locationReasoning?.substring(0, 150)}...`
                  );
                }
                isAIGenerated = true;
                break; // Success!
              }
            }
          }
        } catch (modelErr: any) {
          console.warn(`[Gemini API] Model ${modelName} failed, trying next fallback:`, modelErr?.status || modelErr?.message);
        }
      }

      if (!isAIGenerated) {
        fallbackNotice = "Ekstraksi menggunakan mode cerdas TrendBite (layanan AI sibuk).";
      }
    } else {
      fallbackNotice = "Kunci GEMINI_API_KEY belum disetel di Settings > Secrets. Menggunakan mode kurasi cerdas TrendBite.";
    }

    // 2. Fallback to Supercharged Smart Multi-Slide / Recap Heuristic Extractor
    if (extractedList.length === 0) {
      const { contextCity, items } = segmentRecapOrSlidePost(textToAnalyze);
      if (items.length > 1) {
        // Multi-slide or recap detected
        for (const itemText of items) {
          const single = extractCulinaryHeuristics(itemText, url, personalNotes, contextCity);
          if (
            single.restaurant_name &&
            single.restaurant_name !== "Kuliner Rekomendasi Viral" &&
            !extractedList.some((x) => x.restaurant_name.toLowerCase() === single.restaurant_name.toLowerCase())
          ) {
            extractedList.push(single);
          }
        }
      }

      // If still empty or only 1 single post
      if (extractedList.length === 0) {
        const single = extractCulinaryHeuristics(textToAnalyze, url, personalNotes);
        extractedList.push(single);
      }
    }

    // 3. Clean and Geocode every place with Google Places API
    const finalPlaces: CulinaryParseResult[] = [];
    const seenNames = new Set<string>();

    for (const item of extractedList) {
      let cleanName = item.restaurant_name || "";
      const nameCheck = cleanName.toLowerCase();
      if (
        /jujur ini enak|enak banget|enak parah|viral banget|wajib coba|gila sih|kaget banget|creamy pedes/i.test(nameCheck) ||
        cleanName.trim().endsWith("!!!")
      ) {
        cleanName = cleanIndonesianPlaceName(cleanName);
      }

      // Deduplicate identical restaurant names
      const normKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normKey && seenNames.has(normKey)) {
        continue;
      }
      if (normKey) {
        seenNames.add(normKey);
      }

      // Strict validation: NEVER allow restaurant name to be just city name or blank
      if (isCityOnlyName(cleanName) || cleanName.toLowerCase() === item.city.toLowerCase() || cleanName.length < 3) {
        const dish = item.must_try_dishes?.[0] || "Kuliner";
        cleanName = `${dish} Spesial ${item.city}`;
      }

      const geocoded = await geocodePlace(cleanName, item.city, item.area_hint);

      // Verify official name is also not just city name
      let finalOfficialName = geocoded.official_name || cleanName;
      if (isCityOnlyName(finalOfficialName) || finalOfficialName.toLowerCase() === item.city.toLowerCase()) {
        finalOfficialName = cleanName;
      }

      finalPlaces.push({
        placeId: geocoded.place_id,
        name: finalOfficialName,
        city: item.city,
        address: geocoded.formatted_address,
        lat: geocoded.lat,
        lng: geocoded.lng,
        rating: geocoded.rating,
        recommendedDishes: item.must_try_dishes || [],
        estimatedPrice: item.estimated_price || "Rp 25.000 - Rp 60.000",
        tags: item.tags || ["Kuliner"],
        vibesOrSummary: item.vibes_or_summary || "",
        sourceUrl: url,
        personalNotes: personalNotes || "",
        visualCue: item.raw_visual_cue,
      });
    }

    const isMultiPlace = finalPlaces.length > 1;

    return res.json({
      success: true,
      isAIGenerated,
      isFallback: !isAIGenerated,
      fallbackNotice,
      isMultiPlace,
      reasoningStep: recordedReasoningStep,
      places: finalPlaces,
      data: finalPlaces[0], // Backwards compatible with single place callers
    });
  } catch (error: any) {
    console.error("[parse-link] Mengalihkan ke mode ekstraksi kuliner cerdas cadangan:", error);
    const fallback = extractCulinaryHeuristics(
      req.body?.caption || "",
      req.body?.url || "",
      req.body?.personalNotes || ""
    );
    const geocoded = await geocodePlace(fallback.restaurant_name, fallback.city);
    const singlePlace: CulinaryParseResult = {
      placeId: geocoded.place_id,
      name: geocoded.official_name || fallback.restaurant_name,
      city: fallback.city,
      address: geocoded.formatted_address,
      lat: geocoded.lat,
      lng: geocoded.lng,
      rating: geocoded.rating,
      recommendedDishes: fallback.must_try_dishes,
      estimatedPrice: fallback.estimated_price,
      tags: fallback.tags,
      vibesOrSummary: fallback.vibes_or_summary,
      sourceUrl: req.body?.url || "",
      personalNotes: req.body?.personalNotes || "",
    };

    return res.json({
      success: true,
      isAIGenerated: false,
      isFallback: true,
      fallbackNotice: "Extraction processed using fallback mode.",
      isMultiPlace: false,
      places: [singlePlace],
      data: singlePlace,
    });
  }
});

// Endpoint: Google Places API Search (Autocomplete / Text Search for Quick Notes)
app.get("/api/places/search", async (req, res) => {
  try {
    const query = ((req.query.q || req.query.query || "") as string).trim();
    const city = ((req.query.city || "") as string).trim();
    if (!query || query.length < 2) {
      return res.json({ success: true, isConnected: false, places: [] });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      try {
        const fullQuery = [query, city && city !== "All Cities" ? city : "", "Indonesia"]
          .filter(Boolean)
          .join(" ");
        const endpoint = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          fullQuery
        )}&key=${apiKey}`;
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = (await response.json()) as {
            results?: Array<{
              place_id?: string;
              name?: string;
              formatted_address?: string;
              geometry?: { location?: { lat: number; lng: number } };
              rating?: number;
              user_ratings_total?: number;
              types?: string[];
            }>;
          };

          if (data.results && data.results.length > 0) {
            const places = data.results.slice(0, 6).map((r) => {
              const detectedCity =
                extractCityFromAddress(r.formatted_address) ||
                (city && city !== "All Cities" ? city : "Jakarta Selatan");
              return {
                placeId: r.place_id || `gplace_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: r.name || query,
                address: r.formatted_address || `${r.name || query}, ${detectedCity}`,
                lat: r.geometry?.location?.lat ?? -6.2088,
                lng: r.geometry?.location?.lng ?? 106.8456,
                rating: r.rating || 4.5,
                userRatingsTotal: r.user_ratings_total || 0,
                city: detectedCity,
                isConnected: true,
              };
            });
            return res.json({ success: true, isConnected: true, places });
          }
        }
      } catch (gErr) {
        console.warn("Google Places API search error, falling back to local coordinates:", gErr);
      }
    }

    // Fallback search when API key not available or empty
    const fallbackCities = Object.keys(INDONESIA_CITY_COORDS);
    const matchedCityKey =
      fallbackCities.find(
        (c) => query.toLowerCase().includes(c) || (city && city.toLowerCase().includes(c))
      ) || "jakarta";
    const baseCoords = INDONESIA_CITY_COORDS[matchedCityKey] || { lat: -6.2088, lng: 106.8456 };

    const cleanName = query.trim();
    const fallbackPlace = {
      placeId: `manual_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20)}_${Date.now().toString(36)}`,
      name: cleanName,
      address: `${cleanName}, ${city || "Jakarta Selatan"}`,
      lat: baseCoords.lat + (Math.random() - 0.5) * 0.008,
      lng: baseCoords.lng + (Math.random() - 0.5) * 0.008,
      rating: 4.6,
      userRatingsTotal: 12,
      city: city || "Jakarta Selatan",
      isConnected: false,
    };

    return res.json({ success: true, isConnected: false, places: [fallbackPlace] });
  } catch (err: any) {
    console.error("[places/search] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Manual Place Search & Geocoding
app.post("/api/geocode", async (req, res) => {
  try {
    const { name, city } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Place name is required" });
    }
    const result = await geocodePlace(name, city || "Indonesia");
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: AI Culinary Copilot & Taste Journal Brainstorming (Multi-turn Gemini)
app.post("/api/chat-copilot", async (req, res) => {
  try {
    const { messages, journalEntries } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: "Messages array is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        success: false,
        error: "Gemini API key is not configured on server",
      });
    }

    // Build user journal context
    const journalContextText = (journalEntries || [])
      .map((entry: any, i: number) => {
        const dishes = entry.recommendedDishes?.join(", ") || "General specialties";
        const status = entry.visited ? "Visited (Tried)" : "Wishlist (Want to try)";
        const notes = entry.personalNotes ? `Taste Notes: "${entry.personalNotes}"` : "No personal notes yet";
        return `${i + 1}. ${entry.name} (${entry.city}) | Dishes: ${dishes} | Status: ${status} | ${notes} | Address: ${entry.address || "-"}`;
      })
      .join("\n");

    const systemInstruction = `You are Taste Finder, the AI Culinary Copilot on Jurnal Rasa.
Your mission is to help food lovers explore, plan, compare, and log their culinary adventures intelligently and delightfully.

CORE GUIDELINES:
1. Always communicate in a friendly, enthusiastic, and foodie-savvy tone in ENGLISH by default (or seamlessly adapt if the user explicitly writes in Indonesian).
2. Ground your answers primarily in the user's "PERSONAL TASTE JOURNAL" provided below whenever discussing places they have saved or want to try:
"""
${journalContextText || "The user has not saved any places in their taste journal yet. Politely suggest they save a spot from social media or use Catat Cepat via Google Maps!"}
"""
3. Capabilities:
   - Recommend dining spots from their journal based on city/neighborhood, vibe, craving, time of day, or budget.
   - Design a realistic 1-day foodie itinerary from their wishlist.
   - Compare signature dishes and specialties between spots in their journal.
   - Offer creative culinary recommendations tailored to their taste preferences.
4. Tone: Engaging, warm, knowledgeable, foodie-savvy.
5. Formatting: Structure recommendations neatly with Markdown bullet points and bold restaurant/dish names. Avoid raw unrendered symbols.`;

    // Map client messages to Gemini contents format
    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content || "" }],
    }));

    // Choose robust model
    let responseText = "";
    const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`[chat-copilot] Model ${modelName} error:`, err?.message || err);
      }
    }

    if (!responseText) {
      return res.status(500).json({
        success: false,
        error: "Failed to retrieve response from AI Taste Copilot",
      });
    }

    return res.json({
      success: true,
      reply: responseText,
    });
  } catch (err: any) {
    console.error("[chat-copilot] Server error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Production Static Server Setup
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jurnal Rasa Server running on port ${PORT}`);
  });
}

startServer();
