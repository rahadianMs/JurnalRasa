import React from "react";
import {
  MapPin,
  Star,
  Flame,
  Utensils,
  Tag,
  DollarSign,
  Trash2,
  BookmarkPlus,
  Navigation,
} from "lucide-react";
import { PublicPlace, UserSavedPlace, MapMode } from "../types";
import { getGoogleMapsUrl } from "../lib/maps";

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
      className={`group relative bg-[#FFFDF7] rounded-xl p-4 sm:p-5 border-2 transition-all cursor-pointer ${
        isSelected
          ? "border-[#FF5533] shadow-[4px_4px_0px_#18181B] -translate-x-0.5 -translate-y-0.5 bg-white ring-2 ring-[#FF5533]"
          : "border-[#18181B] hover:shadow-[4.5px_4.5px_0px_#18181B] shadow-[2.5px_2.5px_0px_#18181B] hover:-translate-x-0.5 hover:-translate-y-0.5"
      }`}
    >
      {/* Top Meta Bar */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-[#FEF08A] text-[#18181B] border-[1.5px] border-[#18181B] font-mono-code shadow-[1px_1px_0px_#18181B]">
            {place.city}
          </span>
          {isPublic && (
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border-[1.5px] border-[#18181B] font-mono-code shadow-[1px_1px_0px_#18181B] ${
                isViral
                  ? "bg-[#FF99C8] text-[#18181B]"
                  : "bg-[#BAE6FD] text-[#18181B]"
              }`}
            >
              <Flame className="w-3 h-3 text-rose-600" />
              <span>{saveCount} Saves</span>
              {isViral && <span className="font-black text-[9px] uppercase">🔥 Viral</span>}
            </span>
          )}
        </div>

        {place.rating && (
          <div className="flex items-center gap-1 text-xs font-black bg-[#FEF08A] text-[#18181B] px-2 py-0.5 rounded-md border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B] font-mono-code">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-[#18181B]" />
            <span>{place.rating}</span>
          </div>
        )}
      </div>

      {/* Place Title & Address */}
      <h3 className="text-base font-black font-display text-[#18181B] group-hover:text-[#FF5533] transition-colors tracking-tight">
        {place.name}
      </h3>
      <p className="text-xs text-[#52525B] flex items-center gap-1 mt-1 line-clamp-1 font-medium">
        <MapPin className="w-3.5 h-3.5 text-[#FF5533] shrink-0" />
        <span>{place.address}</span>
      </p>

      {/* Vibes or Summary */}
      {place.vibesOrSummary && (
        <p className="text-xs text-[#18181B] mt-2.5 bg-[#F7F4EA] p-2.5 rounded-lg border-[1.5px] border-[#18181B] italic line-clamp-2 font-handwriting text-sm">
          "{place.vibesOrSummary}"
        </p>
      )}

      {/* Recommended Dishes */}
      {dishes && dishes.length > 0 && (
        <div className="mt-3">
          <span className="text-[10px] font-black text-[#52525B] uppercase tracking-wider block mb-1.5 flex items-center gap-1 font-mono-code">
            <Utensils className="w-3 h-3 text-[#18181B]" /> Recommended Dishes:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {dishes.map((dish, i) => (
              <span
                key={i}
                className="text-xs bg-white hover:bg-[#F7F4EA] text-[#18181B] border-[1.5px] border-[#18181B] font-bold px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#18181B] transition-colors"
              >
                {dish}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Estimated Price & Tags */}
      {"estimatedPrice" in place && place.estimatedPrice && (
        <div className="mt-2.5 pt-2 border-t-[1.5px] border-[#18181B] flex items-center gap-2 text-xs text-[#52525B] font-mono-code font-bold">
          <DollarSign className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>Price: <strong className="text-[#18181B]">{place.estimatedPrice}</strong></span>
        </div>
      )}

      {/* Personal Notes (User Saved Place) */}
      {"personalNotes" in place && place.personalNotes && (
        <div className="mt-2 text-xs bg-[#FEF08A] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] text-[#18181B] p-2.5 rounded-lg">
          <span className="font-mono-code font-black block text-[10px] uppercase tracking-wider text-[#18181B]">
            Taste Note:
          </span>
          <p className="font-handwriting text-sm mt-0.5 leading-snug">"{place.personalNotes}"</p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-3.5 pt-2.5 border-t-[1.5px] border-[#18181B] flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <a
            href={getGoogleMapsUrl(place, "directions")}
            target="_blank"
            rel="noopener noreferrer"
            title="Get Directions on Google Maps"
            className="flex items-center gap-1 text-[11px] font-bold text-[#18181B] bg-white hover:bg-[#F7F4EA] border-[1.5px] border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] px-2.5 py-1.5 rounded-lg transition-all"
          >
            <Navigation className="w-3 h-3 text-[#FF5533]" />
            <span>Directions</span>
          </a>
        </div>

        <div className="flex items-center gap-1.5">
          {mode === "community_pulse" && onSaveToMyRadar && (
            <button
              type="button"
              onClick={() => onSaveToMyRadar(place as PublicPlace)}
              className={`flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 ${
                isSavedInMyRadar
                  ? "bg-[#BBF7D0] text-[#18181B]"
                  : "bg-[#FF5533] text-white hover:bg-[#ff4420]"
              }`}
            >
              <BookmarkPlus className="w-3 h-3" />
              <span>{isSavedInMyRadar ? "Saved" : "+ Save"}</span>
            </button>
          )}

          {mode === "my_radar" && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(place.placeId);
              }}
              title="Remove this place from My Radar"
              className="flex items-center gap-1 text-[11px] font-black text-[#18181B] bg-[#FECDD3] hover:bg-rose-200 border-[1.5px] border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] px-2.5 py-1.5 rounded-lg transition-all"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
