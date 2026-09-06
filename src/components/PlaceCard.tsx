import React from "react";
import {
  MapPin,
  Star,
  Flame,
  Utensils,
  Tag,
  DollarSign,
  ExternalLink,
  Trash2,
  BookmarkPlus,
  Navigation,
} from "lucide-react";
import { PublicPlace, UserSavedPlace, MapMode } from "../types";

interface PlaceCardProps {
  place: PublicPlace | UserSavedPlace;
  mode: MapMode;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: (placeId: string) => void;
  onSaveToMyRadar?: (place: PublicPlace) => void;
  isSavedInMyRadar?: boolean;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  mode,
  isSelected,
  onSelect,
  onDelete,
  onSaveToMyRadar,
  isSavedInMyRadar,
}) => {
  const isPublic = "saveCount" in place;
  const dishes = "recommendedDishes" in place ? place.recommendedDishes : place.topDishes || [];
  const saveCount = isPublic ? place.saveCount : 1;
  const isViral = isPublic && saveCount >= 40;

  return (
    <div
      id={`place-card-${place.placeId}`}
      onClick={onSelect}
      className={`group relative bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer ${
        isSelected
          ? "border-[#FF5C35] shadow-md ring-2 ring-[#FF5C35]/20 bg-[#FFFDFB]"
          : "border-black/[0.08] hover:border-black/20 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md"
      }`}
    >
      {/* Top Meta Bar */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-black/[0.04] text-[#1A1A1A] border border-black/[0.04]">
            {place.city}
          </span>
          {isPublic && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isViral
                  ? "bg-red-500/10 text-red-600 border border-red-500/20"
                  : "bg-[#FF5C35]/10 text-[#FF5C35] border border-[#FF5C35]/20"
              }`}
            >
              <Flame className="w-3 h-3 text-[#FF5C35]" />
              <span>{saveCount} Saves</span>
              {isViral && <span className="font-black text-[9px] uppercase">Viral</span>}
            </span>
          )}
        </div>

        {place.rating && (
          <div className="flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>{place.rating}</span>
          </div>
        )}
      </div>

      {/* Place Title & Address */}
      <h3 className="text-base font-extrabold text-[#1A1A1A] group-hover:text-[#FF5C35] transition-colors tracking-tight">
        {place.name}
      </h3>
      <p className="text-xs text-[#71716E] flex items-center gap-1 mt-1 line-clamp-1">
        <MapPin className="w-3.5 h-3.5 text-[#FF5C35] shrink-0" />
        <span>{place.address}</span>
      </p>

      {/* Vibes or Summary */}
      {place.vibesOrSummary && (
        <p className="text-xs text-[#525252] mt-2.5 bg-black/[0.02] p-2.5 rounded-xl border border-black/[0.05] italic line-clamp-2">
          "{place.vibesOrSummary}"
        </p>
      )}

      {/* Recommended Dishes */}
      {dishes && dishes.length > 0 && (
        <div className="mt-3">
          <span className="text-[10px] font-bold text-[#71716E] uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <Utensils className="w-3 h-3" /> Menu Rekomendasi
          </span>
          <div className="flex flex-wrap gap-1.5">
            {dishes.map((dish, i) => (
              <span
                key={i}
                className="text-xs bg-black/[0.03] hover:bg-black/[0.06] text-[#1A1A1A] border border-black/[0.05] font-semibold px-2.5 py-1 rounded-lg transition-colors"
              >
                {dish}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Estimated Price & Tags (For User Saved Places) */}
      {"estimatedPrice" in place && place.estimatedPrice && (
        <div className="mt-2.5 pt-2 border-t border-black/[0.06] flex items-center gap-2 text-xs text-[#71716E]">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Estimasi: <strong className="text-[#1A1A1A]">{place.estimatedPrice}</strong></span>
        </div>
      )}

      {/* Personal Notes (User Saved Place) */}
      {"personalNotes" in place && place.personalNotes && (
        <div className="mt-2 text-xs bg-emerald-500/[0.07] border border-emerald-500/20 text-emerald-950 p-2.5 rounded-xl">
          <span className="font-bold block text-[10px] uppercase text-emerald-800 tracking-wider">
            Catatan Personal:
          </span>
          <p className="italic mt-0.5">{place.personalNotes}</p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-3.5 pt-2.5 border-t border-black/[0.06] flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-[#1A1A1A] hover:text-black bg-black/[0.04] hover:bg-black/[0.08] border border-black/[0.06] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Navigation className="w-3 h-3 text-[#71716E]" />
            <span>Maps</span>
          </a>

          {(() => {
            const rawUrl = ("sourceUrl" in place && place.sourceUrl) ? place.sourceUrl : "";
            const videoUrl = rawUrl || `https://www.tiktok.com/search?q=${encodeURIComponent(`${place.name} ${place.city}`)}`;
            return (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka Video Ulasan TikTok"
                className="flex items-center gap-1 text-[11px] font-semibold text-[#FF5C35] hover:text-[#E84A23] bg-[#FF5C35]/10 hover:bg-[#FF5C35]/20 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Video Asli</span>
              </a>
            );
          })()}
        </div>

        <div className="flex items-center gap-1.5">
          {mode === "community_pulse" && onSaveToMyRadar && (
            <button
              type="button"
              onClick={() => onSaveToMyRadar(place as PublicPlace)}
              className={`flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                isSavedInMyRadar
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-[#FF5C35] hover:bg-[#E84A23] text-white shadow-sm"
              }`}
            >
              <BookmarkPlus className="w-3 h-3" />
              <span>{isSavedInMyRadar ? "Tersimpan" : "+ Radar"}</span>
            </button>
          )}

          {mode === "my_radar" && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(place.placeId);
              }}
              title="Hapus tempat ini dari Radar Saya"
              className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 px-2.5 py-1.5 rounded-lg transition-all"
            >
              <Trash2 className="w-3 h-3" />
              <span>Hapus</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
