import React, { useState } from "react";
import {
  BookmarkCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  MapPin,
  ExternalLink,
  Trash2,
  Plus,
  Star,
  Utensils,
  Eye,
  PenLine,
  Check,
  BookOpen,
  StickyNote,
  MessageSquare,
  ArrowRight,
  Filter,
  Map,
  Flame,
  Compass,
  Link2,
} from "lucide-react";
import { UserSavedPlace } from "../types";
import { getGoogleMapsUrl } from "../lib/maps";
import { CopilotChat } from "./CopilotChat";

interface JournalViewProps {
  places: UserSavedPlace[];
  onOpenCurator: () => void;
  onOpenQuickManual: () => void;
  onToggleVisited: (placeId: string, currentVisited: boolean) => void;
  onDeletePlace: (placeId: string) => void;
  onSelectOnMap: (place: UserSavedPlace) => void;
  onNavigateToMap?: () => void;
  onNavigateToCommunity?: () => void;
  communityCount?: number;
  selectedCity: string;
  onChangeCity: (city: string) => void;
  selectedTag: string;
  onChangeTag: (tag: string) => void;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  availableCities: string[];
  availableTags: string[];
  initialSubTab?: "places" | "chat";
}

export const JournalView: React.FC<JournalViewProps> = ({
  places,
  onOpenCurator,
  onOpenQuickManual,
  onToggleVisited,
  onDeletePlace,
  onSelectOnMap,
  onNavigateToMap,
  onNavigateToCommunity,
  communityCount = 0,
  selectedCity,
  onChangeCity,
  selectedTag,
  onChangeTag,
  searchQuery,
  onChangeSearch,
  availableCities,
  availableTags,
  initialSubTab = "places",
}) => {
  const [visitedFilter, setVisitedFilter] = useState<"all" | "wishlist" | "visited">("all");
  const [subTab, setSubTab] = useState<"places" | "chat">(initialSubTab);

  // Filter places
  const filteredPlaces = places.filter((p) => {
    // Visited filter
    if (visitedFilter === "wishlist" && p.visited === true) return false;
    if (visitedFilter === "visited" && !p.visited) return false;

    // City filter
    if (selectedCity !== "All Cities" && !p.city.toLowerCase().includes(selectedCity.toLowerCase())) {
      return false;
    }

    // Tag filter
    if (
      selectedTag !== "All Categories" &&
      !(p.tags || []).some((t) => t.toLowerCase() === selectedTag.toLowerCase())
    ) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const dishes = p.recommendedDishes || [];
      const notes = p.personalNotes || "";
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesCity = p.city.toLowerCase().includes(q);
      const matchesDishes = dishes.some((d) => d.toLowerCase().includes(q));
      const matchesNotes = notes.toLowerCase().includes(q);
      const matchesTags = (p.tags || []).some((t) => t.toLowerCase() === q);
      if (!matchesName && !matchesCity && !matchesDishes && !matchesNotes && !matchesTags) {
        return false;
      }
    }

    return true;
  });

  const totalCount = places.length;
  const visitedCount = places.filter((p) => p.visited === true).length;
  const wishlistCount = places.filter((p) => !p.visited).length;

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Notebook Binder Header & Primary Sub-Tab Switcher */}
      <div className="relative bg-[#FFFDF7] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-[2.5px] border-[#18181B] shadow-[4px_4px_0px_#18181B]">
        {/* Decorative corner tag (raised on top border like a bookmark sticker) */}
        <div className="absolute -top-3 right-6 sm:right-8 hidden sm:block bg-[#FEF08A] text-[#18181B] border-[1.5px] border-[#18181B] px-3 py-0.5 text-[10px] font-mono-code font-black uppercase rotate-1 shadow-[1.5px_1.5px_0px_#18181B] z-10 select-none">
          ★ JURNAL RASA EDITION
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight font-display text-[#18181B]">
                Jurnal Rasa
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#BBF7D0] text-[#18181B] border-[1.5px] border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] font-mono-code uppercase">
                Catatan & Finder AI
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#52525B] mt-1 font-medium font-handwriting text-base text-[#18181B]">
              Buku catatan kuliner pribadi, spot viral TikTok/IG tersimpan, dan asisten AI pintar.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 mt-1 sm:mt-0">
            <button
              onClick={onOpenCurator}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#FF5533] hover:bg-[#ff4420] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_#18181B] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              title="Scroll sosmed nemu tempat makan enak? Simpan link-nya di sini biar gak kelupaan!"
            >
              <Link2 className="w-4 h-4 stroke-[2.5]" />
              <span>Simpan dari Sosmed</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 hidden sm:inline" />
            </button>
            <button
              onClick={onOpenQuickManual}
              className="flex items-center justify-center gap-1.5 bg-[#FEF08A] hover:bg-[#fde047] text-[#18181B] border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_#18181B] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              title="Tambah catatan tempat manual atau cari via Google Maps"
            >
              <PenLine className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Catat Cepat</span>
            </button>
          </div>
        </div>

        {/* Quick Access to Peta Rasa & Jelajah Rasa (Especially helpful for mobile users) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 mt-3.5 pt-3.5 border-t-2 border-[#18181B]">
          <button
            type="button"
            id="quick-nav-map-btn"
            onClick={onNavigateToMap}
            className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#BAE6FD] hover:bg-[#7dd3fc] text-[#18181B] border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 group text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white border-2 border-[#18181B] flex items-center justify-center text-[#18181B] shrink-0 font-black shadow-[1.5px_1.5px_0px_#18181B] group-hover:scale-105 transition-transform">
                <Map className="w-4 h-4 text-blue-700 stroke-[2.5]" />
              </div>
              <div className="truncate">
                <div className="text-xs sm:text-sm font-black font-display text-[#18181B] flex items-center gap-1">
                  <span>Peta Rasa</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
                <div className="text-[10px] text-[#52525B] font-mono-code font-bold truncate">
                  Lihat {totalCount} titik di peta
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            id="quick-nav-community-btn"
            onClick={onNavigateToCommunity}
            className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#FF99C8] hover:bg-[#f472b6] text-[#18181B] border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 group text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white border-2 border-[#18181B] flex items-center justify-center text-[#18181B] shrink-0 font-black shadow-[1.5px_1.5px_0px_#18181B] group-hover:scale-105 transition-transform">
                <Flame className="w-4 h-4 text-rose-600 stroke-[2.5]" />
              </div>
              <div className="truncate">
                <div className="text-xs sm:text-sm font-black font-display text-[#18181B] flex items-center gap-1">
                  <span>Jelajah Rasa</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
                <div className="text-[10px] text-[#52525B] font-mono-code font-bold truncate">
                  {communityCount > 0 ? `${communityCount} spot viral` : "Spot viral komunitas"}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Primary Sub-Navigation (Merged: Catatan Tempat & Tanya AI / Finder) */}
        <div className="flex items-center gap-2 mt-3.5 pt-3.5 border-t-2 border-[#18181B]">
          <button
            onClick={() => setSubTab("places")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black border-2 transition-all ${
              subTab === "places"
                ? "bg-[#BAE6FD] text-[#18181B] border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B]"
                : "bg-white text-[#52525B] border-[#18181B] hover:bg-[#F7F4EA] shadow-[1px_1px_0px_#18181B]"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Koleksi Tempat ({totalCount})</span>
          </button>

          <button
            onClick={() => setSubTab("chat")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black border-2 transition-all ${
              subTab === "chat"
                ? "bg-[#FEF08A] text-[#18181B] border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B]"
                : "bg-white text-[#52525B] border-[#18181B] hover:bg-[#F7F4EA] shadow-[1px_1px_0px_#18181B]"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-700" />
            <span>Tanya Asisten AI (Finder)</span>
            <span className="w-2 h-2 rounded-full bg-[#FF5533] border border-[#18181B] animate-ping" />
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: PLACES CARDS & NOTEBOOK INDEX */}
      {subTab === "places" && (
        <div className="space-y-4">
          {/* Quick AI Suggestion Banner inside Places view */}
          <div className="bg-[#FEF08A] rounded-2xl p-3 sm:p-3.5 border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#18181B] flex items-center justify-center text-[#18181B] shrink-0 font-black">
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xs font-bold text-[#18181B] leading-tight">
                Bingung mau makan apa hari ini? Tanya Asisten AI untuk rekomendasikan spot dari catatanmu.
              </p>
            </div>
            <button
              onClick={() => setSubTab("chat")}
              className="self-start sm:self-auto px-3 py-1.5 bg-[#18181B] text-white hover:bg-black rounded-lg text-xs font-black flex items-center gap-1.5 transition-transform hover:-translate-x-0.5 active:translate-x-0.5 shadow-[1.5px_1.5px_0px_#52525B]"
            >
              <span>Mulai Tanya AI</span>
              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>

          {/* Stats index cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            <div
              onClick={() => setVisitedFilter("all")}
              className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border-2 text-center transition-all ${
                visitedFilter === "all"
                  ? "bg-[#BAE6FD] border-[#18181B] shadow-[3px_3px_0px_#18181B] -translate-y-0.5"
                  : "bg-white border-[#18181B] hover:bg-[#F7F4EA] shadow-[1.5px_1.5px_0px_#18181B]"
              }`}
            >
              <div className="text-lg sm:text-2xl font-black font-display text-[#18181B]">{totalCount}</div>
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#18181B] mt-0.5 font-mono-code">
                📖 Semua Entri
              </div>
            </div>

            <div
              onClick={() => setVisitedFilter("wishlist")}
              className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border-2 text-center transition-all ${
                visitedFilter === "wishlist"
                  ? "bg-[#FEF08A] border-[#18181B] shadow-[3px_3px_0px_#18181B] -translate-y-0.5"
                  : "bg-white border-[#18181B] hover:bg-[#F7F4EA] shadow-[1.5px_1.5px_0px_#18181B]"
              }`}
            >
              <div className="text-lg sm:text-2xl font-black font-display text-amber-900 flex items-center justify-center gap-1">
                <span>{wishlistCount}</span>
              </div>
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#18181B] mt-0.5 font-mono-code">
                ⭐ Ingin Coba
              </div>
            </div>

            <div
              onClick={() => setVisitedFilter("visited")}
              className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border-2 text-center transition-all ${
                visitedFilter === "visited"
                  ? "bg-[#BBF7D0] border-[#18181B] shadow-[3px_3px_0px_#18181B] -translate-y-0.5"
                  : "bg-white border-[#18181B] hover:bg-[#F7F4EA] shadow-[1.5px_1.5px_0px_#18181B]"
              }`}
            >
              <div className="text-lg sm:text-2xl font-black font-display text-emerald-950 flex items-center justify-center gap-1">
                <span>{visitedCount}</span>
              </div>
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#18181B] mt-0.5 font-mono-code">
                ✅ Sudah Dicoba
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-[#FFFDF7] rounded-2xl p-3 sm:p-4 border-[2px] border-[#18181B] shadow-[3px_3px_0px_#18181B] flex flex-col md:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-[#18181B] stroke-[2.5] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onChangeSearch(e.target.value)}
                placeholder="Cari tempat, nama menu, atau catatan rasa..."
                className="w-full pl-10 pr-4 py-2 bg-white border-2 border-[#18181B] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5533] font-bold shadow-[1.5px_1.5px_0px_#18181B]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <select
                value={selectedCity}
                onChange={(e) => onChangeCity(e.target.value)}
                className="bg-white hover:bg-[#F7F4EA] border-2 border-[#18181B] text-[#18181B] text-xs font-bold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5533] shadow-[1.5px_1.5px_0px_#18181B]"
              >
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    📍 {c}
                  </option>
                ))}
              </select>

              <select
                value={selectedTag}
                onChange={(e) => onChangeTag(e.target.value)}
                className="bg-white hover:bg-[#F7F4EA] border-2 border-[#18181B] text-[#18181B] text-xs font-bold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5533] shadow-[1.5px_1.5px_0px_#18181B]"
              >
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    🏷️ {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Journal Cards Feed */}
          {filteredPlaces.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlaces.map((place) => {
                const isVisited = place.visited === true;
                return (
                  <div
                    key={place.placeId}
                    className="bg-[#FFFDF7] rounded-2xl p-4 sm:p-5 border-[2.5px] border-[#18181B] shadow-[4px_4px_0px_#18181B] hover:shadow-[5.5px_5.5px_0px_#18181B] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top bar: Status Stamp & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <button
                          onClick={() => onToggleVisited(place.placeId, isVisited)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase font-mono-code transition-transform active:scale-95 border-2 ${
                            isVisited
                              ? "bg-[#BBF7D0] text-[#14532d] border-[#14532d] shadow-[2px_2px_0px_#14532d] -rotate-1"
                              : "bg-[#FEF08A] text-[#713f12] border-[#713f12] shadow-[2px_2px_0px_#713f12] rotate-1"
                          }`}
                          title="Klik untuk ubah status: Sudah Dicoba vs Ingin Coba"
                        >
                          {isVisited ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Sudah Dicoba</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Ingin Dicoba</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onSelectOnMap(place)}
                            className="p-1.5 text-[#18181B] bg-white hover:bg-[#BAE6FD] border-[1.5px] border-[#18181B] rounded-lg shadow-[1px_1px_0px_#18181B] transition-colors"
                            title="Tampilkan di Peta Rasa"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeletePlace(place.placeId)}
                            className="p-1.5 text-rose-700 bg-white hover:bg-rose-100 border-[1.5px] border-[#18181B] rounded-lg shadow-[1px_1px_0px_#18181B] transition-colors"
                            title="Hapus dari Jurnal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Place Name & Location */}
                      <div>
                        <h3 className="text-lg font-black font-display text-[#18181B] leading-tight group-hover:text-[#FF5533] transition-colors">
                          {place.name}
                        </h3>
                        <p className="text-xs text-[#52525B] flex items-center gap-1 mt-1 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-[#FF5533] shrink-0" />
                          <span className="text-[#18181B] font-bold">{place.city}</span>
                          <span className="truncate">• {place.address}</span>
                        </p>
                      </div>

                      {/* Personal Taste Notes (Post-it / sticky note style) */}
                      {place.personalNotes && (
                        <div className="mt-3.5 bg-[#FEF08A] border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] p-3 rounded-xl rotate-[-0.5deg]">
                          <div className="font-mono-code font-black text-[10px] uppercase tracking-wider text-[#18181B] flex items-center gap-1.5 mb-1">
                            <StickyNote className="w-3 h-3 text-[#FF5533]" />
                            <span>Catatan Rasa Pribadi:</span>
                          </div>
                          <p className="font-handwriting text-sm sm:text-base leading-snug text-[#18181B]">
                            "{place.personalNotes}"
                          </p>
                        </div>
                      )}

                      {/* Visual Cue Grounding tag if extracted from slide photo */}
                      {place.visualCue && (
                        <div className="mt-2.5 text-[10px] text-[#18181B] bg-[#BAE6FD] border-[1.5px] border-[#18181B] px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-mono-code font-bold shadow-[1px_1px_0px_#18181B]">
                          <Eye className="w-3 h-3 text-blue-900 shrink-0" />
                          <span>Petunjuk foto slide:</span>
                          <span className="truncate underline">{place.visualCue}</span>
                        </div>
                      )}

                      {/* Recommended Dishes */}
                      {place.recommendedDishes && place.recommendedDishes.length > 0 && (
                        <div className="mt-3.5">
                          <div className="text-[10px] font-black text-[#52525B] uppercase tracking-wider mb-1.5 flex items-center gap-1 font-mono-code">
                            <Utensils className="w-3 h-3 text-[#18181B]" />
                            <span>Menu Rekomendasi:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {place.recommendedDishes.map((dish, i) => (
                              <span
                                key={i}
                                className="bg-white text-[#18181B] text-[11px] font-bold px-2.5 py-0.5 rounded-md border-[1.5px] border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]"
                              >
                                {dish}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer bar with external links & rating */}
                    <div className="mt-4 pt-3 border-t-2 border-[#18181B] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {place.rating && (
                          <span className="inline-flex items-center gap-1 font-black text-[#18181B] bg-[#FEF08A] px-2 py-0.5 rounded-md border border-[#18181B] text-xs font-mono-code shadow-[1px_1px_0px_#18181B]">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-[#18181B]" />
                            <span>{place.rating.toFixed(1)}</span>
                          </span>
                        )}
                        {place.estimatedPrice && (
                          <span className="text-[11px] text-[#52525B] font-mono-code font-bold">
                            {place.estimatedPrice}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectOnMap(place)}
                          className="inline-flex items-center gap-1 text-[11px] font-black text-[#18181B] bg-[#BAE6FD] hover:bg-[#7dd3fc] px-2 py-0.5 rounded border border-[#18181B] shadow-[1px_1px_0px_#18181B] font-mono-code transition-colors"
                          title="Buka titik spot ini di Peta Rasa"
                        >
                          <MapPin className="w-3 h-3 text-[#FF5533]" />
                          <span>Peta Rasa</span>
                        </button>
                        {place.sourceUrl && (
                          <a
                            href={place.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-black text-[#18181B] hover:text-[#FF5533] underline font-mono-code"
                          >
                            <span>Sumber</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <a
                          href={getGoogleMapsUrl(place)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-black text-[#18181B] bg-[#FEF08A] hover:bg-[#fde047] px-2 py-0.5 rounded border border-[#18181B] shadow-[1px_1px_0px_#18181B] font-mono-code transition-colors"
                          title="Buka rute navigasi di Google Maps"
                        >
                          <span>Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Quick Navigation for Mobile/Desktop */}
            <div className="bg-[#FFFDF7] rounded-2xl p-4 border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left mt-4">
              <div>
                <h4 className="text-sm font-black font-display text-[#18181B]">
                  Eksplorasi Jurnal Rasa Lebih Lanjut
                </h4>
                <p className="text-xs text-[#52525B] font-medium mt-0.5">
                  Buka semua titik di Peta Rasa atau temukan spot rekomendasi viral dari komunitas kuliner.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  id="bottom-nav-map-btn"
                  onClick={onNavigateToMap}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#BAE6FD] hover:bg-[#7dd3fc] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl text-xs font-black transition-transform hover:-translate-x-0.5 active:translate-x-0.5"
                >
                  <Map className="w-3.5 h-3.5 text-blue-700 stroke-[2.5]" />
                  <span>Buka Peta Rasa</span>
                </button>
                <button
                  type="button"
                  id="bottom-nav-community-btn"
                  onClick={onNavigateToCommunity}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#FF99C8] hover:bg-[#f472b6] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl text-xs font-black transition-transform hover:-translate-x-0.5 active:translate-x-0.5"
                >
                  <Flame className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                  <span>Jelajah Rasa</span>
                </button>
              </div>
            </div>
            </>
          ) : (
            <div className="bg-[#FFFDF7] rounded-3xl p-8 sm:p-12 text-center border-[2.5px] border-[#18181B] shadow-[4px_4px_0px_#18181B]">
              <div className="w-16 h-16 rounded-2xl bg-[#FEF08A] border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-[#18181B]" />
              </div>
              <h4 className="text-lg font-black font-display text-[#18181B]">
                Belum ada catatan yang cocok
              </h4>
              <p className="text-xs sm:text-sm text-[#52525B] max-w-md mx-auto mt-1 font-handwriting text-base">
                Scroll sosmed nemu spot kuliner enak? Simpan tautan TikTok/IG ke sini biar gak lupa, atau gunakan Catat Cepat via Google Maps.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                <button
                  onClick={onOpenCurator}
                  className="bg-[#FF5533] hover:bg-[#ff4420] text-white px-4 py-2 rounded-xl text-xs font-black border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 flex items-center gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Simpan dari Sosmed</span>
                </button>
                <button
                  onClick={onOpenQuickManual}
                  className="bg-[#FEF08A] hover:bg-[#fde047] text-[#18181B] px-4 py-2 rounded-xl text-xs font-black border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5"
                >
                  Catat Cepat
                </button>
                <button
                  onClick={onNavigateToCommunity}
                  className="bg-[#FF99C8] hover:bg-[#f472b6] text-[#18181B] px-4 py-2 rounded-xl text-xs font-black border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                  <span>Jelajah Viral</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: MERGED COPILOT CHAT / FINDER */}
      {subTab === "chat" && (
        <div className="space-y-3">
          <div className="bg-[#FFFDF7] p-3 rounded-2xl border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] flex items-center justify-between">
            <button
              onClick={() => setSubTab("places")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FEF08A] hover:bg-[#fde047] text-[#18181B] border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] rounded-xl text-xs font-black transition-transform hover:-translate-x-0.5"
            >
              <BookOpen className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>← Kembali ke Daftar Catatan</span>
            </button>
            <span className="text-[11px] font-mono-code font-bold text-[#52525B]">
              Terhubung ke {totalCount} tempat di Jurnal Rasa
            </span>
          </div>

          <CopilotChat journalPlaces={places} />
        </div>
      )}
    </div>
  );
};
