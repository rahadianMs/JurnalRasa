import React, { useState, useEffect, useRef } from "react";
import {
  X,
  PenLine,
  MapPin,
  Utensils,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Check,
  Navigation,
  Globe2,
  ExternalLink,
  Loader2,
  Unlink,
} from "lucide-react";
import { UserSavedPlace } from "../types";
import { CITIES } from "../lib/demoData";

interface QuickManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (place: UserSavedPlace) => void;
}

interface GooglePlaceSuggestion {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  userRatingsTotal?: number;
  city: string;
  isConnected?: boolean;
}

export const QuickManualModal: React.FC<QuickManualModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Jakarta Selatan");
  const [address, setAddress] = useState("");
  const [dishes, setDishes] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(5);
  const [visited, setVisited] = useState(false);
  const [loading, setLoading] = useState(false);

  // Google Maps Places Search & Autocomplete
  const [suggestions, setSuggestions] = useState<GooglePlaceSuggestion[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [connectedPlace, setConnectedPlace] = useState<GooglePlaceSuggestion | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Google Maps place search
  const handleNameChange = (val: string) => {
    setName(val);
    // If user edits text after connecting, disconnect unless it's identical
    if (connectedPlace && val !== connectedPlace.name) {
      setConnectedPlace(null);
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchingPlaces(false);
      return;
    }

    setIsSearchingPlaces(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams({
          q: val.trim(),
          city: city || "",
        });
        const res = await fetch(`/api/places/search?${queryParams.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.places) && data.places.length > 0) {
          setSuggestions(data.places);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.warn("Failed to search places via Google Maps API:", err);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = (place: GooglePlaceSuggestion) => {
    setName(place.name);
    setAddress(place.address);
    if (place.city) {
      setCity(place.city);
    }
    setConnectedPlace(place);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleDisconnect = () => {
    setConnectedPlace(null);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    try {
      let lat = connectedPlace?.lat ?? -6.2088;
      let lng = connectedPlace?.lng ?? 106.8456;
      let finalAddress = address.trim() || connectedPlace?.address || `${name}, ${city}`;
      let placeId = connectedPlace?.placeId;

      // If not connected to a Google Maps place yet, attempt server geocoding
      if (!connectedPlace) {
        try {
          const geoRes = await fetch("/api/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, city }),
          });
          const geoData = await geoRes.json();
          if (geoData.success && geoData.data) {
            lat = geoData.data.lat || lat;
            lng = geoData.data.lng || lng;
            finalAddress = geoData.data.formatted_address || finalAddress;
            placeId = geoData.data.place_id || placeId;
          }
        } catch (err) {
          console.warn("Manual geocode failed, using city coords:", err);
        }
      }

      const dishList = dishes
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      const newPlace: UserSavedPlace = {
        placeId: placeId || "manual_" + Date.now().toString(36),
        name: name.trim(),
        city,
        address: finalAddress,
        lat,
        lng,
        rating: connectedPlace?.rating || 4.5,
        tasteRating: rating,
        recommendedDishes: dishList.length > 0 ? dishList : ["Menu Andalan"],
        tags: connectedPlace ? ["Google Maps", "Catatan Rasa"] : ["Manual Entry", "Catatan Rasa"],
        personalNotes: notes.trim(),
        visited,
        savedAt: new Date().toISOString(),
        vibesOrSummary: notes.trim() || `Catatan rasa pribadi untuk ${name}`,
      };

      onSave(newPlace);
      onClose();

      // Reset form
      setName("");
      setAddress("");
      setDishes("");
      setNotes("");
      setVisited(false);
      setConnectedPlace(null);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FFFDF7] rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 border-[3px] border-[#18181B] shadow-[8px_8px_0px_#18181B] space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#18181B] pb-3 bg-[#F7F4EA] -mx-5 -mt-5 sm:-mx-6 sm:-mt-6 p-4 sm:p-5 rounded-t-2xl sm:rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-center font-black">
              <PenLine className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black font-display text-[#18181B]">
                Tambah Catatan Rasa
              </h3>
              <p className="text-xs text-[#52525B] font-handwriting">
                Cari tempat via Google Maps API agar koordinat & alamat terhubung langsung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#18181B] bg-white hover:bg-[#FECDD3] border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] rounded-lg transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {/* Restaurant / Place Name with Live Google Maps Search */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider font-mono-code">
                Nama Tempat / Restoran *
              </label>
              <span className="text-[10px] font-bold text-[#FF5533] flex items-center gap-1 font-mono-code">
                <Globe2 className="w-3 h-3 text-[#FF5533]" />
                Google Maps Connected
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Ketik nama tempat (contoh: Gultik Blok M, Haraku Ramen...)"
                className="w-full pl-9 pr-9 py-2.5 bg-white border-2 border-[#18181B] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5533] font-bold shadow-[2px_2px_0px_#18181B]"
              />
              <Search className="w-4 h-4 text-[#71716E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

              {isSearchingPlaces && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-[#FF5533] animate-spin" />
                </div>
              )}
            </div>

            {/* Google Maps Search Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#FFFDF7] border-2 border-[#18181B] shadow-[4px_4px_0px_#18181B] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <div className="px-3 py-1.5 bg-[#FEF08A] border-b-2 border-[#18181B] flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#18181B] font-mono-code flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#FF5533]" />
                    Pilih Lokasi dari Google Maps
                  </span>
                  <span className="text-[9px] text-[#52525B] font-mono-code">
                    {suggestions.length} hasil
                  </span>
                </div>

                <div className="divide-y border-[#18181B]/20">
                  {suggestions.map((item) => (
                    <button
                      key={item.placeId}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left p-2.5 hover:bg-[#F7F4EA] transition-colors flex items-start gap-2.5 group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#BAE6FD] text-[#18181B] border border-[#18181B] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <MapPin className="w-3.5 h-3.5 text-[#18181B]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-black text-[#18181B] truncate group-hover:text-[#FF5533]">
                            {item.name}
                          </p>
                          {item.rating && (
                            <span className="text-[10px] font-black text-amber-700 bg-[#FEF08A] border border-[#18181B] px-1 rounded flex items-center gap-0.5 shrink-0">
                              ⭐ {item.rating}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#52525B] truncate font-medium">
                          {item.address}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Connected Google Maps Banner */}
          {connectedPlace && (
            <div className="p-2.5 bg-[#DCFCE7] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-[#18181B]">
                      Terhubung Google Maps
                    </span>
                    <span className="text-[9px] font-mono-code font-black px-1.5 py-0.2 rounded bg-white text-[#18181B] border border-[#18181B]">
                      ⭐ {connectedPlace.rating}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#18181B]/80 line-clamp-1 font-medium mt-0.5">
                    {connectedPlace.address}
                  </p>
                  <p className="text-[10px] font-mono-code text-[#52525B] mt-0.5">
                    Koordinat: {connectedPlace.lat.toFixed(4)}, {connectedPlace.lng.toFixed(4)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                title="Lepas tautan Google Maps"
                className="p-1 text-[#18181B] hover:bg-rose-100 rounded border border-transparent hover:border-[#18181B] shrink-0"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider mb-1 font-mono-code">
                Kota / Wilayah
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-[#18181B] rounded-xl text-xs text-[#18181B] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5533] shadow-[2px_2px_0px_#18181B]"
              >
                {CITIES.filter((c) => c !== "All Cities").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider mb-1 font-mono-code">
                Status Kunjungan
              </label>
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setVisited(false)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all border-2 ${
                    !visited
                      ? "bg-[#FEF08A] text-[#18181B] border-[#18181B] shadow-[2px_2px_0px_#18181B]"
                      : "bg-white text-stone-600 border-[#18181B]/40"
                  }`}
                >
                  ⭐ Ingin Coba
                </button>
                <button
                  type="button"
                  onClick={() => setVisited(true)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all border-2 ${
                    visited
                      ? "bg-[#BBF7D0] text-[#18181B] border-[#18181B] shadow-[2px_2px_0px_#18181B]"
                      : "bg-white text-stone-600 border-[#18181B]/40"
                  }`}
                >
                  ✅ Sudah Coba
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider mb-1 font-mono-code">
              Menu Andalan / Rekomendasi Makanan
            </label>
            <input
              type="text"
              value={dishes}
              onChange={(e) => setDishes(e.target.value)}
              placeholder="Pisahkan dengan koma (contoh: Sate Ayam Madura, Es Jeruk Nipis)"
              className="w-full px-3.5 py-2.5 bg-white border-2 border-[#18181B] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5533] font-bold shadow-[2px_2px_0px_#18181B]"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider mb-1 font-mono-code">
              Catatan Rasa Pribadi (Taste Notes)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tulis ulasan rasa, suasana, tips parkir, atau alasan rekomendasi teman..."
              className="w-full px-3.5 py-2 bg-white border-2 border-[#18181B] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5533] font-bold shadow-[2px_2px_0px_#18181B]"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider mb-1 font-mono-code">
              Rating Rasa Pribadi: {rating} / 5
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 stroke-[2] ${
                      star <= rating
                        ? "fill-amber-400 text-[#18181B]"
                        : "text-stone-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t-2 border-[#18181B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black text-[#18181B] hover:bg-[#F7F4EA] rounded-xl border border-transparent"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-[#FF5533] hover:bg-[#ff4420] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-black border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  <span>Simpan ke Jurnal Rasa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
