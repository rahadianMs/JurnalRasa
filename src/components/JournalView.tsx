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
  Info,
} from "lucide-react";
import { UserSavedPlace, RecommendedTastePlace } from "../types";
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
  onSavePlace?: (place: RecommendedTastePlace) => Promise<void> | void;
  onOpenArchInfo?: () => void;
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
  onSavePlace,
  onOpenArchInfo,
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
          ★ NUSANTARA EDITION
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight font-display text-[#18181B]">
                Taste Journal
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#BBF7D0] text-[#18181B] border-[1.5px] border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] font-mono-code uppercase">
                Notes & AI Finder
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#52525B] mt-1 font-medium font-handwriting text-base text-[#18181B]">
              Personal culinary journal, saved TikTok/IG viral spots, and smart AI taste assistant.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 mt-1 sm:mt-0">
            <button
              onClick={onOpenCurator}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#FF5533] hover:bg-[#ff4420] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_#18181B] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              title="Quick save food spots from TikTok or Instagram links"
            >
              <Link2 className="w-4 h-4 stroke-[2.5]" />
              <span>Quick Save</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 hidden sm:inline" />
            </button>
            <button
              onClick={onOpenQuickManual}
              className="flex items-center justify-center gap-1.5 bg-[#FEF08A] hover:bg-[#fde047] text-[#18181B] border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_#18181B] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              title="Add place note manually or search via Google Maps"
            >
              <PenLine className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Quick Note</span>
            </button>
            {onOpenArchInfo && (
              <button
                onClick={onOpenArchInfo}
                className="flex items-center justify-center p-2.5 bg-white hover:bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] rounded-xl text-xs sm:text-sm font-black transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_#18181B] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shrink-0"
                title="Jurnal Rasa Architecture Information"
                aria-label="Jurnal Rasa Architecture Information"
              >
                <Info className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Primary Sub-Navigation (Koleksi Tempat vs Tanya AI Copilot) */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t-2 border-[#18181B]">
          <button
            onClick={() => setSubTab("places")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black border-2 transition-all ${
              subTab === "places"
                ? "bg-[#BAE6FD] text-[#18181B] border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B]"
                : "bg-white text-[#52525B] border-[#18181B] hover:bg-[#F7F4EA] shadow-[1px_1px_0px_#18181B]"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Places Collection ({totalCount})</span>
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
            <span>Taste Finder AI</span>
            <span className="w-2 h-2 rounded-full bg-[#FF5533] border border-[#18181B] animate-ping" />
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: PLACES CARDS & NOTEBOOK INDEX */}
      {subTab === "places" && (
        <div className="space-y-3.5">
          {/* Compact Filter Status Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setVisitedFilter("all")}
                className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black transition-all flex items-center gap-1.5 ${
                  visitedFilter === "all"
                    ? "bg-[#BAE6FD] text-[#18181B] border-[#18181B] shadow-[2px_2px_0px_#18181B]"
                    : "bg-white text-[#52525B] border-[#18181B] hover:bg-[#F7F4EA]"
                }`}
              >
                <span>All Entries</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#18181B] border border-[#18181B] font-mono-code font-bold">
                  {totalCount}
                </span>
              </button>

              <button
                onClick={() => setVisitedFilter("wishlist")}
                className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black transition-all flex items-center gap-1.5 ${
                  visitedFilter === "wishlist"
                    ? "bg-[#FEF08A] text-[#18181B] border-[#18181B] shadow-[2px_2px_0px_#18181B]"
                    : "bg-white text-[#52525B] border-[#18181B] hover:bg-[#F7F4EA]"
                }`}
              >
                <span>Want to Try</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#18181B] border border-[#18181B] font-mono-code font-bold">
                  {wishlistCount}
                </span>
              </button>

              <button
                onClick={() => setVisitedFilter("visited")}
                className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black transition-all flex items-center gap-1.5 ${
                  visitedFilter === "visited"
                    ? "bg-[#BBF7D0] text-[#18181B] border-[#18181B] shadow-[2px_2px_0px_#18181B]"
                    : "bg-white text-[#52525B] border-[#18181B] hover:bg-[#F7F4EA]"
                }`}
              >
                <span>Tried & Tested</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#18181B] border border-[#18181B] font-mono-code font-bold">
                  {visitedCount}
                </span>
              </button>
            </div>

            {/* Quick AI Trigger */}
            <button
              onClick={() => setSubTab("chat")}
              className="text-xs font-bold text-[#18181B] hover:text-[#FF5533] flex items-center gap-1 bg-[#FEF08A] px-2.5 py-1.5 rounded-xl border border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>AI Taste Advisor</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-[#FFFDF7] rounded-2xl p-3 sm:p-4 border-[2px] border-[#18181B] shadow-[3px_3px_0px_#18181B] flex flex-col md:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-[#18181B] stroke-[2.5] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onChangeSearch(e.target.value)}
                placeholder="Search places, signature dishes, or taste notes..."
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
                          title="Click to toggle status: Tried vs Want to Try"
                        >
                          {isVisited ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Tried</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Want to Try</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onSelectOnMap(place)}
                            className="p-1.5 text-[#18181B] bg-white hover:bg-[#BAE6FD] border-[1.5px] border-[#18181B] rounded-lg shadow-[1px_1px_0px_#18181B] transition-colors"
                            title="Show on Taste Map"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeletePlace(place.placeId)}
                            className="p-1.5 text-rose-700 bg-white hover:bg-rose-100 border-[1.5px] border-[#18181B] rounded-lg shadow-[1px_1px_0px_#18181B] transition-colors"
                            title="Delete from Journal"
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
                            <span>Personal Taste Notes:</span>
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
                          <span>Slide visual cue:</span>
                          <span className="truncate underline">{place.visualCue}</span>
                        </div>
                      )}

                      {/* Recommended Dishes */}
                      {place.recommendedDishes && place.recommendedDishes.length > 0 && (
                        <div className="mt-3.5">
                          <div className="text-[10px] font-black text-[#52525B] uppercase tracking-wider mb-1.5 flex items-center gap-1 font-mono-code">
                            <Utensils className="w-3 h-3 text-[#18181B]" />
                            <span>Recommended Dishes:</span>
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
                          title="Show this spot on Taste Map"
                        >
                          <MapPin className="w-3 h-3 text-[#FF5533]" />
                          <span>Taste Map</span>
                        </button>
                        {place.sourceUrl && (
                          <a
                            href={place.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-black text-[#18181B] hover:text-[#FF5533] underline font-mono-code"
                          >
                            <span>Source</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <a
                          href={getGoogleMapsUrl(place)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-black text-[#18181B] bg-[#FEF08A] hover:bg-[#fde047] px-2 py-0.5 rounded border border-[#18181B] shadow-[1px_1px_0px_#18181B] font-mono-code transition-colors"
                          title="Open directions in Google Maps"
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
                  Explore Further in Jurnal Rasa
                </h4>
                <p className="text-xs text-[#52525B] font-medium mt-0.5">
                  View all spots on Taste Map or discover viral gems recommended by the culinary community.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  id="bottom-nav-map-btn"
                  onClick={onNavigateToMap}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#BAE6FD] hover:bg-[#7dd3fc] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl text-xs font-black transition-transform hover:-translate-x-0.5 active:translate-x-0.5 cursor-pointer"
                >
                  <Map className="w-3.5 h-3.5 text-blue-700 stroke-[2.5]" />
                  <span>Open Taste Map</span>
                </button>
                <button
                  type="button"
                  id="bottom-nav-community-btn"
                  onClick={onNavigateToCommunity}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#FF99C8] hover:bg-[#f472b6] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl text-xs font-black transition-transform hover:-translate-x-0.5 active:translate-x-0.5 cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                  <span>Explore Taste</span>
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
                No matching notes found
              </h4>
              <p className="text-xs sm:text-sm text-[#52525B] max-w-md mx-auto mt-1 font-handwriting text-base">
                Found an appetizing spot on social media? Save the TikTok/IG link here so you never forget, or use Quick Note with Google Maps.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                <button
                  onClick={onOpenCurator}
                  className="bg-[#FF5533] hover:bg-[#ff4420] text-white px-4 py-2 rounded-xl text-xs font-black border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 flex items-center gap-1.5 cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Quick Save</span>
                </button>
                <button
                  onClick={onOpenQuickManual}
                  className="bg-[#FEF08A] hover:bg-[#fde047] text-[#18181B] px-4 py-2 rounded-xl text-xs font-black border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 cursor-pointer"
                >
                  Quick Note
                </button>
                <button
                  onClick={onNavigateToCommunity}
                  className="bg-[#FF99C8] hover:bg-[#f472b6] text-[#18181B] px-4 py-2 rounded-xl text-xs font-black border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 flex items-center gap-1.5 cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                  <span>Explore Viral Gems</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FEF08A] hover:bg-[#fde047] text-[#18181B] border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] rounded-xl text-xs font-black transition-transform hover:-translate-x-0.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>← Back to Notes List</span>
            </button>
            <span className="text-[11px] font-mono-code font-bold text-[#52525B]">
              Grounded in {totalCount} spots in your Jurnal Rasa
            </span>
          </div>

          <CopilotChat journalPlaces={places} onSavePlace={onSavePlace} />
        </div>
      )}
    </div>
  );
};
