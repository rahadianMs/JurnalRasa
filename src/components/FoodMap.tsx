import React, { useEffect, useState, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { PublicPlace, UserSavedPlace, MapMode } from "../types";
import { getGoogleMapsUrl, fetchGoogleMapsApiKey } from "../lib/maps";
import {
  Utensils,
  Star,
  Flame,
  BookmarkPlus,
  Trash2,
  Navigation,
  MapPin,
  RefreshCw,
  X,
} from "lucide-react";

interface FoodMapProps {
  mode: MapMode;
  places: (PublicPlace | UserSavedPlace)[];
  selectedPlace: (PublicPlace | UserSavedPlace) | null;
  onSelectPlace: (place: PublicPlace | UserSavedPlace | null) => void;
  onClose?: () => void;
  onSaveToMyRadar?: (place: PublicPlace) => void;
  onDelete?: (placeId: string) => void;
  userSavedPlaceIds: Set<string>;
}

// Camera controller to smoothly pan/zoom on place selection or places change
const MapCameraController: React.FC<{
  selectedPlace: (PublicPlace | UserSavedPlace) | null;
  places: (PublicPlace | UserSavedPlace)[];
}> = ({ selectedPlace, places }) => {
  const map = useMap();
  const prevSelectedIdRef = useRef<string | null>(null);

  // Pan to selected place smoothly when user selects a place
  useEffect(() => {
    if (!map || !selectedPlace?.lat || !selectedPlace?.lng) return;
    if (prevSelectedIdRef.current !== selectedPlace.placeId) {
      prevSelectedIdRef.current = selectedPlace.placeId;
      map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
      map.setZoom(16);
    }
  }, [map, selectedPlace]);

  // When filtered places change and no place is specifically selected, center on available spots
  useEffect(() => {
    if (!map || selectedPlace || !places || places.length === 0) return;
    if (places.length === 1 && places[0].lat && places[0].lng) {
      map.panTo({ lat: places[0].lat, lng: places[0].lng });
      map.setZoom(13);
    }
  }, [map, places, selectedPlace]);

  return null;
};

export const FoodMap: React.FC<FoodMapProps> = ({
  mode,
  places,
  selectedPlace,
  onSelectPlace,
  onClose,
  onSaveToMyRadar,
  onDelete,
  userSavedPlaceIds,
}) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isLoadingKey, setIsLoadingKey] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    fetchGoogleMapsApiKey().then((key) => {
      if (isMounted) {
        setApiKey(key);
        setIsLoadingKey(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      onSelectPlace(null);
    }
  };

  // Keyboard shortcut: Press Escape to close active place card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedPlace) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPlace, onClose, onSelectPlace]);

  const isPublic = mode === "community_pulse";

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-2xl sm:rounded-3xl overflow-hidden border-[3px] border-[#18181B] shadow-[6px_6px_0px_#18181B] bg-[#EBEBE8] flex flex-col">
      {/* Google Maps Viewport */}
      {isLoadingKey ? (
        <div className="w-full h-full min-h-[440px] flex flex-col items-center justify-center bg-[#FFFDF7] p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF08A] border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] flex items-center justify-center animate-spin mb-3">
            <RefreshCw className="w-6 h-6 text-[#18181B]" />
          </div>
          <h4 className="text-sm font-black font-display text-[#18181B]">
            Loading Google Maps...
          </h4>
          <p className="text-xs text-[#52525B] font-mono-code mt-1">
            Connecting to Google Maps Platform
          </p>
        </div>
      ) : !apiKey ? (
        <div className="w-full h-full min-h-[440px] flex flex-col items-center justify-center bg-[#FFFDF7] p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FF5533] text-white border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] flex items-center justify-center font-black text-xl mb-3">
            !
          </div>
          <h4 className="text-base font-black font-display text-[#18181B]">
            Google Maps API Key Not Found
          </h4>
          <p className="text-xs text-[#52525B] max-w-sm mt-1">
            Ensure that the <code className="bg-[#FEF08A] px-1 py-0.5 rounded border border-[#18181B] font-bold">GOOGLE_MAPS_API_KEY</code> environment variable is set.
          </p>
        </div>
      ) : (
        <APIProvider apiKey={apiKey} libraries={["places", "marker", "geometry"]}>
          <div className="w-full h-full min-h-[440px] z-0">
            <Map
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              defaultCenter={{ lat: -6.2297, lng: 106.8295 }}
              defaultZoom={12}
              gestureHandling="greedy"
              disableDefaultUI={false}
              streetViewControl={false}
              mapTypeControl={false}
              style={{ width: "100%", height: "100%" }}
              onClick={() => {
                if (selectedPlace) {
                  handleClose();
                }
              }}
            >
              <MapCameraController
                selectedPlace={selectedPlace}
                places={places}
              />

              {places.map((place) => {
                if (!place.lat || !place.lng) return null;

                const isSelected = selectedPlace?.placeId === place.placeId;
                const saveCount = "saveCount" in place ? (place.saveCount as number) : 1;
                const isVisited = "visited" in place && place.visited;
                const isViral = isPublic && saveCount >= 40;

                return (
                  <AdvancedMarker
                    key={place.placeId}
                    position={{ lat: place.lat, lng: place.lng }}
                    onClick={(e) => {
                      if (isSelected) {
                        handleClose();
                      } else {
                        onSelectPlace(place);
                      }
                    }}
                    title={place.name}
                    zIndex={isSelected ? 1000 : undefined}
                  >
                    <div
                      className={`relative cursor-pointer transition-transform ${
                        isSelected ? "scale-125 z-50" : "hover:scale-110"
                      }`}
                    >
                      <div
                        className={`px-2.5 py-1.5 rounded-xl border-2 border-[#18181B] text-xs font-black flex items-center gap-1.5 shadow-[2.5px_2.5px_0px_#18181B] whitespace-nowrap font-mono-code ${
                          isSelected
                            ? "bg-[#FF5533] text-white ring-2 ring-[#18181B]"
                            : !isPublic && isVisited
                            ? "bg-[#BBF7D0] text-[#18181B]"
                            : isViral
                            ? "bg-[#FF5533] text-white"
                            : saveCount >= 25
                            ? "bg-[#FEF08A] text-[#18181B]"
                            : "bg-white text-[#18181B]"
                        }`}
                      >
                        <span>
                          {isPublic ? (
                            isViral ? "🔥" : "🍴"
                          ) : isVisited ? (
                            "✓"
                          ) : (
                            "🍴"
                          )}
                        </span>
                        <span className="max-w-[110px] truncate">{place.name}</span>
                        {isPublic && (
                          <span className="text-[10px] opacity-85">({saveCount})</span>
                        )}
                      </div>
                      <div className="w-2.5 h-2.5 bg-[#18181B] rotate-45 mx-auto -mt-1 shadow-xs" />
                    </div>
                  </AdvancedMarker>
                );
              })}
            </Map>
          </div>
        </APIProvider>
      )}

      {/* Mode Indicator Badge (Top Left) */}
      <div className="absolute top-3 left-3 z-10 bg-[#FFFDF7] px-3 py-1.5 rounded-xl border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] text-xs font-black text-[#18181B] flex items-center gap-2 pointer-events-none font-mono-code">
        {mode === "my_radar" ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#18181B]" />
            <span>Personal Food Map ({places.length} Spots)</span>
          </>
        ) : (
          <>
            <Flame className="w-3.5 h-3.5 text-[#FF5533] stroke-[3]" />
            <span>Community Radar ({places.length} Recommendations)</span>
          </>
        )}
      </div>

      {/* Selected Place Floating Drawer Card */}
      {selectedPlace && (
        <div className="absolute bottom-3 left-2.5 right-2.5 sm:bottom-4 sm:left-6 sm:right-auto sm:max-w-sm z-20 bg-[#FFFDF7] rounded-2xl p-3.5 sm:p-4 shadow-[4px_4px_0px_#18181B] sm:shadow-[5px_5px_0px_#18181B] border-[2.5px] border-[#18181B] max-h-[85%] overflow-y-auto transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 pr-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#FEF08A] text-[#18181B] px-2 py-0.5 rounded border border-[#18181B] font-mono-code">
                  {selectedPlace.city}
                </span>
                {"visited" in selectedPlace && (
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded border border-[#18181B] font-mono-code ${
                      selectedPlace.visited
                        ? "bg-[#BBF7D0] text-[#18181B]"
                        : "bg-[#BAE6FD] text-[#18181B]"
                    }`}
                  >
                    {selectedPlace.visited ? "Tried" : "Want to Try"}
                  </span>
                )}
                {"saveCount" in selectedPlace && (
                  <span className="text-[10px] font-black bg-[#FECDD3] text-[#18181B] px-2 py-0.5 rounded flex items-center gap-1 border border-[#18181B] font-mono-code">
                    <Flame className="w-3 h-3 text-[#FF5533] stroke-[3]" />
                    {selectedPlace.saveCount} Saved
                  </span>
                )}
              </div>
              <h3 className="text-base font-black font-display text-[#18181B] mt-1.5 tracking-tight leading-snug">
                {selectedPlace.name}
              </h3>
              <p className="text-xs text-[#52525B] line-clamp-1 mt-0.5 font-medium">
                {selectedPlace.address}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedPlace.rating && (
                <div className="text-xs font-black bg-[#FEF08A] text-[#18181B] px-2 py-1 rounded-lg border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 fill-[#18181B] text-[#18181B]" />
                  <span>{selectedPlace.rating}</span>
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="p-1.5 rounded-lg bg-white hover:bg-[#FF5533] text-[#18181B] hover:text-white border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] transition-colors cursor-pointer flex items-center justify-center"
                title="Close (Esc)"
                aria-label="Close place details"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Dishes */}
          {((selectedPlace as any).recommendedDishes || (selectedPlace as any).topDishes)?.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-[#18181B] bg-white p-2 rounded-xl border-2 border-[#18181B]">
              <Utensils className="w-3.5 h-3.5 text-[#FF5533] shrink-0" />
              <span className="font-bold line-clamp-1">
                {(
                  (selectedPlace as any).recommendedDishes ||
                  (selectedPlace as any).topDishes
                ).join(", ")}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3.5 flex items-center gap-2 pt-2 border-t-2 border-[#18181B]">
            {/* Google Maps Route External Link */}
            <a
              href={getGoogleMapsUrl(selectedPlace)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 bg-[#BAE6FD] hover:bg-[#7dd3fc] text-[#18181B] border-2 border-[#18181B] rounded-xl text-xs font-black shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Directions</span>
            </a>

            {/* Save to My Radar (if community mode and not saved yet) */}
            {isPublic && onSaveToMyRadar && (
              <button
                onClick={() => onSaveToMyRadar(selectedPlace as PublicPlace)}
                disabled={userSavedPlaceIds.has(selectedPlace.placeId)}
                className={`py-2 px-3 rounded-xl border-2 border-[#18181B] text-xs font-black shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer ${
                  userSavedPlaceIds.has(selectedPlace.placeId)
                    ? "bg-[#E5E7EB] text-[#6B7280] cursor-not-allowed"
                    : "bg-[#FF5533] hover:bg-[#ff4420] text-white"
                }`}
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>
                  {userSavedPlaceIds.has(selectedPlace.placeId) ? "Saved" : "Save"}
                </span>
              </button>
            )}

            {/* Delete button (if private radar mode) */}
            {!isPublic && onDelete && (
              <button
                onClick={() => onDelete(selectedPlace.placeId)}
                className="p-2 bg-white hover:bg-rose-50 text-rose-600 border-2 border-[#18181B] rounded-xl text-xs font-black shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer"
                title="Remove from Food Journal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
