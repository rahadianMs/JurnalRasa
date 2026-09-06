import React, { useState } from "react";
import {
  X,
  Sparkles,
  Link as LinkIcon,
  AlertCircle,
  MapPin,
  Utensils,
  Tag,
  DollarSign,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  Edit2,
  CheckSquare,
  Square,
  Layers,
} from "lucide-react";
import { CulinaryParseResult } from "../types";

interface CuratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (place: CulinaryParseResult, personalNotes: string) => Promise<void>;
  onSaveMultiple?: (places: Array<{ parsed: CulinaryParseResult; personalNotes: string }>) => Promise<void>;
}

export const CuratorModal: React.FC<CuratorModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  onSaveMultiple,
}) => {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [showManualCaption, setShowManualCaption] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Multi-place support state
  const [extractedPlaces, setExtractedPlaces] = useState<CulinaryParseResult[]>([]);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
  const [notesPerPlace, setNotesPerPlace] = useState<Record<string, string>>({});
  const [isMultiPlace, setIsMultiPlace] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setUrl("");
    setCaption("");
    setPersonalNotes("");
    setShowManualCaption(false);
    setError(null);
    setFallbackNotice(null);
    setIsEditing(false);
    setExtractedPlaces([]);
    setSelectedPlaceIds(new Set());
    setNotesPerPlace({});
    setIsMultiPlace(false);
  };

  const handleApplyPreset = (sampleUrl: string, sampleCaption: string, sampleNotes: string) => {
    setUrl(sampleUrl);
    setCaption(sampleCaption);
    setPersonalNotes(sampleNotes);
    setShowManualCaption(true);
    setError(null);
    setFallbackNotice(null);
    setExtractedPlaces([]);
  };

  const handleExtractWithAI = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() && !caption.trim()) {
      setError("Masukkan URL TikTok / Instagram atau tempelkan caption deskripsi video.");
      return;
    }

    setLoading(true);
    setError(null);
    setFallbackNotice(null);

    try {
      const response = await fetch("/api/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          caption: caption.trim(),
          personalNotes: personalNotes.trim(),
        }),
      });

      const res = await response.json();

      if (!res.success) {
        if (res.needManualCaption) {
          setShowManualCaption(true);
          setError(res.message);
        } else {
          setError(res.error || "Gagal mengekstrak kuliner dengan AI.");
        }
        return;
      }

      const places: CulinaryParseResult[] = res.places || (res.data ? [res.data] : []);
      if (places.length === 0) {
        setError("Tidak ada tempat kuliner yang berhasil diekstrak. Silakan periksa caption.");
        setShowManualCaption(true);
        return;
      }

      setExtractedPlaces(places);
      const isMulti = res.isMultiPlace || places.length > 1;
      setIsMultiPlace(isMulti);
      setSelectedPlaceIds(new Set(places.map((p) => p.placeId)));

      // Initialize notes per place with personalNotes default
      const notesMap: Record<string, string> = {};
      places.forEach((p) => {
        notesMap[p.placeId] = personalNotes || "";
      });
      setNotesPerPlace(notesMap);

      if (res.isFallback && res.fallbackNotice) {
        setFallbackNotice(res.fallbackNotice);
      }
    } catch (err: any) {
      console.error("AI parse request failed:", err);
      setError("Terjadi kesalahan saat menghubungi server. Periksa koneksi atau coba caption manual.");
      setShowManualCaption(true);
    } finally {
      setLoading(false);
    }
  };

  const togglePlaceSelection = (placeId: string) => {
    setSelectedPlaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPlaceIds.size === extractedPlaces.length) {
      setSelectedPlaceIds(new Set());
    } else {
      setSelectedPlaceIds(new Set(extractedPlaces.map((p) => p.placeId)));
    }
  };

  const handleCommitSave = async () => {
    if (extractedPlaces.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      if (isMultiPlace && extractedPlaces.length > 1) {
        const placesToSave = extractedPlaces.filter((p) => selectedPlaceIds.has(p.placeId));
        if (placesToSave.length === 0) {
          setError("Pilih setidaknya satu tempat kuliner untuk disimpan.");
          setSaving(false);
          return;
        }

        if (onSaveMultiple) {
          const payload = placesToSave.map((p) => ({
            parsed: p,
            personalNotes: notesPerPlace[p.placeId] || personalNotes || "",
          }));
          await Promise.race([
            onSaveMultiple(payload),
            new Promise((resolve) => setTimeout(resolve, 4000)),
          ]);
        } else {
          // Fallback sequential save
          for (const p of placesToSave) {
            await onSaveSuccess(p, notesPerPlace[p.placeId] || personalNotes || "");
          }
        }
      } else {
        // Single place save
        const target = extractedPlaces[0];
        await Promise.race([
          onSaveSuccess(target, personalNotes || notesPerPlace[target.placeId] || ""),
          new Promise((resolve) => setTimeout(resolve, 3500)),
        ]);
      }

      handleReset();
      onClose();
    } catch (err: any) {
      console.error("Failed to commit place:", err);
      handleReset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-black/[0.08] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-black/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF5C35]/10 text-[#FF5C35] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#1A1A1A] tracking-tight">
                Kurasi Rekomendasi Kuliner (AI Parser)
              </h2>
              <p className="text-xs text-[#71716E]">
                Mendukung 1 tempat, multi-slide foto, atau video recap kumpulan tempat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#71716E] hover:text-[#1A1A1A] hover:bg-black/[0.04] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Preset Samples */}
          {extractedPlaces.length === 0 && (
            <div className="bg-black/[0.02] border border-black/[0.06] rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF5C35]" /> Coba Contoh Cepat:
                </span>
                <span className="text-[11px] text-[#71716E]">Klik untuk mencoba parser</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset(
                      "https://www.tiktok.com/@foodies/photo/71234567890",
                      `Slide 1: 4 Rekomendasi Kuliner Hidden Gem di Blok M Jaksel!
Slide 2: Gultik Blok M Pak Agus - Gulai sapi empuk kuah gurih berlemak cuma 15rb
Slide 3: Claypot Popo Melawai - Claypot siram telur mentah hangat mantap 45rb
Slide 4: Haka Dimsum Kemang - Siomay udang, hakau & onde onde wijen buka 24 jam
Slide 5: OO Donut Blok M - Donat kentang lembut viral start 12rb`,
                      "Wajib coba pas weekend keliling Blok M & Kemang!"
                    )
                  }
                  className="text-xs bg-[#FF5C35]/10 text-[#FF5C35] hover:bg-[#FF5C35] hover:text-white border border-[#FF5C35]/30 px-3 py-1.5 rounded-xl transition-all font-bold shadow-sm flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>📸 Carousel Slide: 4 Spot Blok M & Jaksel</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset(
                      "https://www.tiktok.com/@kulinerbandung/video/723456789",
                      `Top 3 Bakso Terenak di Bandung!
1. Bakso Cuanki Serayu - Jl Bengawan Cihapit. Bakso kuah gurih batagor renyah 20rb
2. Bakso Bintang Jahe - Lengkong Kecil. Kuah rempah jahe pedas hangat
3. Mie Baso Akung - Lodaya. Yamin manis pedas kuah komplit ceker pangsit`,
                      "Trip kuliner Bandung bareng keluarga"
                    )
                  }
                  className="text-xs bg-white text-[#1A1A1A] hover:text-[#FF5C35] border border-black/[0.08] hover:border-[#FF5C35]/40 px-3 py-1.5 rounded-xl transition-all font-semibold shadow-sm"
                >
                  🍲 Recap Video: 3 Bakso Viral Bandung
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset(
                      "https://vt.tiktok.com/ZSqFoDRbs/",
                      "JUJUR INI ENAKKK!! creamy pedes gongggg @Haraku Ramen Halal di Gandaria City Jaksel #harakuramen #creamybararamen harga cuma 35rb",
                      "Mau cobain menu Creamy BARA Ramen kuah pedas gurih bareng teman"
                    )
                  }
                  className="text-xs bg-white text-[#1A1A1A] hover:text-[#FF5C35] border border-black/[0.08] hover:border-[#FF5C35]/40 px-3 py-1.5 rounded-xl transition-all font-semibold shadow-sm"
                >
                  🍜 1 Tempat: Haraku Ramen
                </button>
              </div>
            </div>
          )}

          {/* Input Form */}
          {extractedPlaces.length === 0 ? (
            <form onSubmit={handleExtractWithAI} className="space-y-4">
              {/* URL Input */}
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                  Tautan Video TikTok atau Instagram
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71716E]">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="input-social-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@.../photo/... atau https://vt.tiktok.com/..."
                    className="w-full pl-10 pr-4 py-2.5 bg-black/[0.03] border border-black/[0.08] rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5C35] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* Caption / Text Area Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualCaption(!showManualCaption)}
                  className="text-xs font-bold text-[#FF5C35] hover:text-[#E84A23] flex items-center gap-1 transition-colors"
                >
                  {showManualCaption ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>
                    {showManualCaption
                      ? "Sembunyikan Input Caption / Teks Postingan"
                      : "Postingan slide foto atau recap? Klik untuk input caption/daftar tempat"}
                  </span>
                </button>

                {showManualCaption && (
                  <div className="mt-2.5 p-3.5 bg-[#FF5C35]/[0.05] border border-[#FF5C35]/20 rounded-2xl space-y-1.5 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A1A]">
                      <AlertCircle className="w-4 h-4 text-[#FF5C35] shrink-0" />
                      <span>Input Caption / Keterangan Slide Foto:</span>
                    </div>
                    <textarea
                      id="input-caption-manual"
                      rows={4}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder={`Contoh untuk Slide Carousel / Recap:
Slide 1: Rekomendasi Kuliner Jaksel
Slide 2: Gultik Blok M Pak Agus - gulai 15rb
Slide 3: Claypot Popo Melawai - telur mentah 45rb
Slide 4: Haka Dimsum Kemang - siomay udang`}
                      className="w-full p-2.5 bg-white border border-[#FF5C35]/20 rounded-xl text-xs text-[#1A1A1A] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5C35] transition-all font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Personal Notes */}
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
                  Catatan Pribadi (Opsional)
                </label>
                <div className="relative">
                  <div className="absolute top-2.5 left-3.5 text-[#71716E] pointer-events-none">
                    <FileText className="w-4 h-4" />
                  </div>
                  <textarea
                    id="input-personal-notes"
                    rows={2}
                    value={personalNotes}
                    onChange={(e) => setPersonalNotes(e.target.value)}
                    placeholder="Contoh: Rencana coba bareng teman kantor pas weekend..."
                    className="w-full pl-10 pr-3 py-2 bg-black/[0.03] border border-black/[0.08] rounded-xl text-xs text-[#1A1A1A] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5C35] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{error}</p>
                    <p className="text-[11px] text-red-600 mt-0.5">
                      Tips: Tempel teks caption atau daftar nama tempat di kolom caption manual di atas.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                id="btn-submit-ai-extract"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#FF5C35] hover:bg-[#E84A23] disabled:bg-stone-300 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengekstrak tempat kuliner & geocoding Google Maps...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Ekstrak Tempat Kuliner & Google Maps</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Results Review Mode */
            <div className="space-y-4 animate-fade-in">
              {fallbackNotice ? (
                <div className="bg-amber-500/[0.08] border border-amber-500/20 p-3 rounded-xl flex items-start gap-2.5 text-amber-950 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Mode Kurasi Cerdas RasaRadar Aktif</span>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      {fallbackNotice} Koordinat dan nama resmi divalidasi dengan Google Places API.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/[0.08] border border-emerald-500/20 p-3 rounded-xl flex items-center gap-2 text-emerald-950 text-xs font-bold">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {isMultiPlace
                      ? `Berhasil mengekstrak ${extractedPlaces.length} tempat kuliner dari postingan!`
                      : "Ekstraksi & validasi Google Places berhasil! Periksa data sebelum menyimpan."}
                  </span>
                </div>
              )}

              {/* Multi-place Carousel / Recap Mode */}
              {isMultiPlace && extractedPlaces.length > 1 ? (
                <div className="space-y-3">
                  {/* Multi-place header controls */}
                  <div className="flex items-center justify-between px-1 py-1">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A] hover:text-[#FF5C35] transition-colors"
                    >
                      {selectedPlaceIds.size === extractedPlaces.length ? (
                        <CheckSquare className="w-4 h-4 text-[#FF5C35]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#71716E]" />
                      )}
                      <span>
                        Pilih Semua ({selectedPlaceIds.size} dari {extractedPlaces.length} Tempat)
                      </span>
                    </button>
                    <span className="text-[11px] text-[#71716E]">
                      Centang tempat yang ingin kamu simpan ke Radar
                    </span>
                  </div>

                  {/* List of extracted places */}
                  <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                    {extractedPlaces.map((place, idx) => {
                      const isSelected = selectedPlaceIds.has(place.placeId);
                      return (
                        <div
                          key={place.placeId}
                          onClick={() => togglePlaceSelection(place.placeId)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white border-[#FF5C35]/40 shadow-sm ring-1 ring-[#FF5C35]/20"
                              : "bg-black/[0.01] border-black/[0.06] opacity-60 hover:opacity-90"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5 shrink-0">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#FF5C35]" />
                              ) : (
                                <Square className="w-4 h-4 text-[#71716E]" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FF5C35]/10 text-[#FF5C35]">
                                    Spot #{idx + 1}
                                  </span>
                                  <h4 className="text-sm font-extrabold text-[#1A1A1A] truncate">
                                    {place.name}
                                  </h4>
                                </div>
                                {place.rating && (
                                  <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md shrink-0">
                                    ⭐ {place.rating}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#71716E] flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#FF5C35] shrink-0" />
                                <span className="font-bold text-[#1A1A1A]">{place.city}</span>
                                <span className="truncate">• {place.address}</span>
                              </p>

                              {/* Dishes */}
                              {place.recommendedDishes && place.recommendedDishes.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {place.recommendedDishes.map((d, dIdx) => (
                                    <span
                                      key={dIdx}
                                      className="text-[11px] bg-black/[0.04] text-[#1A1A1A] px-2 py-0.5 rounded-md font-medium"
                                    >
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Price & Note */}
                              <div className="flex items-center justify-between text-[11px] text-[#71716E] pt-1">
                                <span className="font-semibold text-emerald-700">
                                  {place.estimatedPrice}
                                </span>
                                <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                                  {place.tags[0] || "Kuliner"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Single Place Review Card */
                <div className="bg-white border border-black/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-4 space-y-3">
                  {extractedPlaces[0] && (
                    <>
                      <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                        <span className="text-[11px] font-bold text-[#71716E] uppercase tracking-wider">
                          Hasil Kurasi Kuliner
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditing(!isEditing)}
                          className="flex items-center gap-1 text-xs font-bold text-[#FF5C35] hover:text-[#E84A23] bg-[#FF5C35]/10 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{isEditing ? "Selesai Edit" : "Sunting Rincian"}</span>
                        </button>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-[#71716E] mb-1">
                              Nama Resto / Warung:
                            </label>
                            <input
                              type="text"
                              value={extractedPlaces[0].name}
                              onChange={(e) => {
                                const updated = [...extractedPlaces];
                                updated[0] = { ...updated[0], name: e.target.value };
                                setExtractedPlaces(updated);
                              }}
                              className="w-full p-2 bg-black/[0.02] border border-black/[0.08] rounded-xl text-xs font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-bold text-[#71716E] mb-1">
                                Kota / Area:
                              </label>
                              <input
                                type="text"
                                value={extractedPlaces[0].city}
                                onChange={(e) => {
                                  const updated = [...extractedPlaces];
                                  updated[0] = { ...updated[0], city: e.target.value };
                                  setExtractedPlaces(updated);
                                }}
                                className="w-full p-2 bg-black/[0.02] border border-black/[0.08] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#71716E] mb-1">
                                Estimasi Harga:
                              </label>
                              <input
                                type="text"
                                value={extractedPlaces[0].estimatedPrice}
                                onChange={(e) => {
                                  const updated = [...extractedPlaces];
                                  updated[0] = { ...updated[0], estimatedPrice: e.target.value };
                                  setExtractedPlaces(updated);
                                }}
                                className="w-full p-2 bg-black/[0.02] border border-black/[0.08] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#71716E] mb-1">
                              Alamat Lengkap Google Maps:
                            </label>
                            <input
                              type="text"
                              value={extractedPlaces[0].address}
                              onChange={(e) => {
                                const updated = [...extractedPlaces];
                                updated[0] = { ...updated[0], address: e.target.value };
                                setExtractedPlaces(updated);
                              }}
                              className="w-full p-2 bg-black/[0.02] border border-black/[0.08] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-extrabold text-[#1A1A1A] tracking-tight">
                                {extractedPlaces[0].name}
                              </h3>
                              <p className="text-xs text-[#71716E] flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-[#FF5C35]" />
                                <span className="font-bold text-[#1A1A1A]">{extractedPlaces[0].city}</span> •{" "}
                                {extractedPlaces[0].address}
                              </p>
                            </div>
                            {extractedPlaces[0].rating && (
                              <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-1 rounded-lg shrink-0">
                                ⭐ {extractedPlaces[0].rating}
                              </span>
                            )}
                          </div>

                          {extractedPlaces[0].vibesOrSummary && (
                            <p className="text-xs italic text-[#71716E] bg-black/[0.02] p-2.5 rounded-xl border border-black/[0.06]">
                              "{extractedPlaces[0].vibesOrSummary}"
                            </p>
                          )}

                          {/* Recommended Dishes */}
                          <div>
                            <span className="text-[11px] font-bold text-[#71716E] uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                              <Utensils className="w-3.5 h-3.5 text-[#1A1A1A]" /> Menu Rekomendasi:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {extractedPlaces[0].recommendedDishes.map((dish, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-black/[0.04] text-[#1A1A1A] font-medium px-2.5 py-1 rounded-md border border-black/[0.04]"
                                >
                                  {dish}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-black/[0.06]">
                            <div className="flex items-center gap-1.5 text-xs text-[#1A1A1A]">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Harga: <strong>{extractedPlaces[0].estimatedPrice}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#1A1A1A]">
                              <Tag className="w-3.5 h-3.5 text-[#FF5C35]" />
                              <span className="truncate">Tag: {extractedPlaces[0].tags.join(", ")}</span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Personal Notes */}
                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-[#71716E] uppercase tracking-wider mb-1">
                          Catatan Personal Saya:
                        </label>
                        <textarea
                          rows={2}
                          value={personalNotes}
                          onChange={(e) => setPersonalNotes(e.target.value)}
                          placeholder="Contoh: Mau coba bareng teman kantor pas weekend..."
                          className="w-full p-2.5 bg-black/[0.02] border border-black/[0.08] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Source link info */}
              {url && (
                <div className="text-[11px] text-[#71716E] flex items-center gap-1 truncate px-1">
                  <ExternalLink className="w-3 h-3 text-[#71716E] shrink-0" />
                  <span className="truncate">Sumber: {url}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExtractedPlaces([])}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-[#1A1A1A] bg-black/[0.04] hover:bg-black/[0.08] transition-colors"
                >
                  Ubah / Ekstrak Ulang
                </button>
                <button
                  id="btn-confirm-save"
                  type="button"
                  disabled={saving || (isMultiPlace && selectedPlaceIds.size === 0)}
                  onClick={handleCommitSave}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#FF5C35] hover:bg-[#E84A23] disabled:bg-stone-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition-all hover:scale-[1.01]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Radar...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {isMultiPlace && extractedPlaces.length > 1
                          ? `Simpan ${selectedPlaceIds.size} Tempat ke Radar`
                          : "Simpan ke Radar & Peta"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
