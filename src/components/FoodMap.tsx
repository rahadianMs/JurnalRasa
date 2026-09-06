import React, { useEffect, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { PublicPlace, UserSavedPlace, MapMode } from "../types";
import { getGoogleMapsUrl } from "../lib/maps";
import {
  MapPin,
  Navigation,
  Utensils,
  Star,
  Flame,
  ExternalLink,
  BookmarkPlus,
  Trash2,
  Bookmark,
  Loader2,
} from "lucide-react";

interface FoodMapProps {
  mode: MapMode;
  places: (PublicPlace | UserSavedPlace)[];
  selectedPlace: (PublicPlace | UserSavedPlace) | null;
  onSelectPlace: (place: PublicPlace | UserSavedPlace) => void;
  onSaveToMyRadar?: (place: PublicPlace) => void;
  onDelete?: (placeId: string) => void;
  userSavedPlaceIds: Set<string>;
}

// Camera and view controller hook component
const MapCameraHandler: React.FC<{
  places: (PublicPlace | UserSavedPlace)[];
  selectedPlace: (PublicPlace | UserSavedPlace) | null;
}> = ({ places, selectedPlace }) => {
  const map = useMap();

  // Smoothly pan & zoom to the selected place
  useEffect(() => {
    if (!map || !selectedPlace || !selectedPlace.lat || !selectedPlace.lng) return;
    map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
    map.setZoom(15);
  }, [map, selectedPlace]);

  // Auto-fit all markers when place list changes and no single place is highlighted
  useEffect(() => {
    if (!map || selectedPlace || places.length === 0) return;
    if (typeof google === "undefined" || !google.maps) return;

    try {
      const bounds = new google.maps.LatLngBounds();
      let validCount = 0;
      places.forEach((p) => {
        if (p.lat && p.lng) {
          bounds.extend({ lat: p.lat, lng: p.lng });
          validCount++;
        }
      });

      if (validCount > 0) {
        map.fitBounds(bounds, {
          top: 60,
          bottom: 120,
          left: 60,
          right: 60,
        });
      }
    } catch (err) {
      console.warn("Could not fit bounds:", err);
    }
  }, [map, places, selectedPlace]);

  return null;
};

export const FoodMap: React.FC<FoodMapProps> = ({
  mode,
  places,
  selectedPlace,
  onSelectPlace,
  onSaveToMyRadar,
  onDelete,
  userSavedPlaceIds,
}) => {
  const [apiKey, setApiKey] = useState<string>(
    ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || ""
  );
  const [loadingKey, setLoadingKey] = useState(!apiKey);

  // Fetch Google Maps API key from backend if not in client env
  useEffect(() => {
    if (apiKey) return;
    let isMounted = true;
    fetch("/api/config/maps")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.apiKey) {
          setApiKey(data.apiKey);
        }
      })
      .catch((err) => console.warn("Failed to fetch Google Maps API config:", err))
      .finally(() => {
        if (isMounted) setLoadingKey(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  if (loadingKey) {
    return (
      <div className="w-full h-full min-h-[420px] rounded-3xl overflow-hidden border border-black/[0.08] bg-[#EBEBE8] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Loader2 className="w-7 h-7 text-[#FF5C35] animate-spin" />
        <span className="text-xs font-semibold text-[#71716E]">
          Loading Google Maps Platform...
        </span>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full min-h-[420px] rounded-3xl overflow-hidden border border-black/[0.08] bg-[#EBEBE8] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
          <MapPin className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-[#1A1A1A]">
          Google Maps API Key Not Configured
        </h3>
        <p className="text-xs text-[#71716E] max-w-sm">
          Please set <code className="bg-black/[0.06] px-1.5 py-0.5 rounded text-[#1A1A1A] font-mono">GOOGLE_MAPS_API_KEY</code> in your project environment settings.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl sm:rounded-3xl overflow-hidden border-[3px] border-[#18181B] shadow-[6px_6px_0px_#18181B] bg-[#EBEBE8]">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={{ lat: -6.2297, lng: 106.8295 }}
          defaultZoom={12}
          mapId="DEMO_MAP_ID"
          style={{ width: "100%", height: "100%", minHeight: "420px" }}
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
        >
          <MapCameraHandler places={places} selectedPlace={selectedPlace} />

          {/* Render Advanced Markers for each Culinary Place */}
          {places.map((place) => {
            if (!place.lat || !place.lng) return null;
            const isSelected = selectedPlace?.placeId === place.placeId;
            const isPublic = mode === "community_pulse";
            const saveCount = "saveCount" in place ? (place.saveCount as number) : 1;
            const isViral = isPublic && saveCount >= 40;

            return (
              <AdvancedMarker
                key={place.placeId}
                position={{ lat: place.lat, lng: place.lng }}
                onClick={() => onSelectPlace(place)}
                title={place.name}
              >
                {mode === "my_radar" ? (
                  <div className="relative flex items-center justify-center cursor-pointer group">
                    <div
                      className={`w-10 h-10 rounded-xl border-2 border-[#18181B] ${
                        isSelected
                          ? "bg-[#FEF08A] scale-125 shadow-[3px_3px_0px_#18181B] z-30"
                          : "bg-[#BBF7D0] hover:scale-110 shadow-[2px_2px_0px_#18181B]"
                      } text-[#18181B] flex items-center justify-center transition-transform font-black`}
                    >
                      <Bookmark className="w-4 h-4 fill-[#18181B] stroke-[2.5]" />
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center cursor-pointer group">
                    <div
                      className={`w-10 h-10 rounded-xl border-2 border-[#18181B] ${
                        isViral
                          ? "bg-[#FF5533] text-white shadow-[3px_3px_0px_#18181B] animate-pulse"
                          : saveCount >= 25
                          ? "bg-[#FEF08A] text-[#18181B] shadow-[2px_2px_0px_#18181B]"
                          : "bg-white text-[#18181B] shadow-[2px_2px_0px_#18181B]"
                      } flex flex-col items-center justify-center transition-transform ${
                        isSelected ? "scale-125 shadow-[4px_4px_0px_#18181B] z-30" : "hover:scale-110"
                      }`}
                    >
                      <div className="flex items-center text-[10px] font-black leading-none font-mono-code">
                        <span className="mr-0.5">🔥</span>
                        <span>{saveCount}</span>
                      </div>
                    </div>
                    {isViral && (
                      <div className="absolute -top-3 whitespace-nowrap bg-[#18181B] text-[#FEF08A] text-[9px] font-black px-1.5 py-0.2 rounded border border-[#FEF08A] font-mono-code uppercase">
                        Viral
                      </div>
                    )}
                  </div>
                )}
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>

      {/* Floating Mode Info Badge */}
      <div className="absolute top-4 left-4 z-10 bg-[#FFFDF7] px-3.5 py-1.5 rounded-xl border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] text-xs font-black text-[#18181B] flex items-center gap-2 pointer-events-none font-mono-code">
        {mode === "my_radar" ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#18181B]"></span>
            <span>Google Maps: Private Radar ({places.length} Spots)</span>
          </>
        ) : (
          <>
            <Flame className="w-3.5 h-3.5 text-[#FF5533] stroke-[3]" />
            <span>Google Maps: Community Pulse ({places.length} Food Spots)</span>
          </>
        )}
      </div>

      {/* Floating Selected Place Info Card (Bottom Center / Left) */}
      {selectedPlace && (
        <div className="absolute bottom-5 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm z-20 bg-[#FFFDF7] rounded-2xl p-4 shadow-[5px_5px_0px_#18181B] border-[2.5px] border-[#18181B] animate-slide-up">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#FEF08A] text-[#18181B] px-2 py-0.5 rounded border border-[#18181B] font-mono-code">
                  {selectedPlace.city}
                </span>
                {"saveCount" in selectedPlace && (
                  <span className="text-[10px] font-black bg-[#FECDD3] text-[#18181B] px-2 py-0.5 rounded flex items-center gap-1 border border-[#18181B] font-mono-code">
                    <Flame className="w-3 h-3 text-[#FF5533] stroke-[3]" />
                    {selectedPlace.saveCount} Saved
                  </span>
                )}
              </div>
              <h3 className="text-base font-black font-display text-[#18181B] mt-1.5 tracking-tight">
                {selectedPlace.name}
              </h3>
              <p className="text-xs text-[#52525B] line-clamp-1 mt-0.5 font-medium">
                {selectedPlace.address}
              </p>
            </div>
            {selectedPlace.rating && (
              <div className="text-xs font-black bg-[#FEF08A] text-[#18181B] px-2 py-1 rounded-lg border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] flex items-center gap-0.5 shrink-0">
                <Star className="w-3.5 h-3.5 fill-[#18181B] text-[#18181B]" />
                <span>{selectedPlace.rating}</span>
              </div>
            )}
          </div>

          {/* Dishes */}
          <div className="mt-2.5 pt-2 border-t-2 border-[#18181B]">
            <span className="text-[10px] font-black text-[#52525B] uppercase tracking-wider block mb-1 flex items-center gap-1 font-mono-code">
              <Utensils className="w-3 h-3 stroke-[2.5]" /> Recommended Dishes
            </span>
            <div className="flex flex-wrap gap-1">
              {(
                ("recommendedDishes" in selectedPlace
                  ? selectedPlace.recommendedDishes
                  : (selectedPlace as PublicPlace).topDishes) || []
              ).map((d, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-white text-[#18181B] border border-[#18181B] font-bold px-2 py-0.5 rounded shadow-[1px_1px_0px_#18181B]"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* Personal notes if available */}
          {"personalNotes" in selectedPlace && selectedPlace.personalNotes && (
            <div className="mt-2 text-xs bg-[#FEF08A] text-[#18181B] p-2 rounded-lg border border-[#18181B] font-handwriting">
              "{selectedPlace.personalNotes}"
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 pt-2.5 border-t-2 border-[#18181B] flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <a
              href={getGoogleMapsUrl(selectedPlace, "directions")}
              target="_blank"
              rel="noopener noreferrer"
              title="Get Directions on Google Maps (Registered Place)"
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 bg-[#18181B] hover:bg-black text-[#FFFDF7] text-xs font-black py-2 px-3 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <Navigation className="w-3.5 h-3.5 text-[#FEF08A] stroke-[2.5]" />
              <span>Directions</span>
            </a>

            {(() => {
              const rawUrl =
                "sourceUrl" in selectedPlace && selectedPlace.sourceUrl
                  ? selectedPlace.sourceUrl
                  : "";
              const videoUrl =
                rawUrl ||
                `https://www.tiktok.com/search?q=${encodeURIComponent(
                  `${selectedPlace.name} ${selectedPlace.city}`
                )}`;
              return (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Watch Original Review Video on TikTok"
                  className="flex items-center gap-1.5 py-2 px-3 text-[#18181B] bg-white hover:bg-[#FEF08A] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 text-xs font-black shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Review Video</span>
                </a>
              );
            })()}

            {mode === "community_pulse" && onSaveToMyRadar && (
              <button
                type="button"
                onClick={() => onSaveToMyRadar(selectedPlace as PublicPlace)}
                className={`flex items-center gap-1 text-xs font-black py-2 px-3 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 shrink-0 ${
                  userSavedPlaceIds.has(selectedPlace.placeId)
                    ? "bg-[#BBF7D0] text-[#18181B]"
                    : "bg-[#FF5533] text-white"
                }`}
              >
                <BookmarkPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {userSavedPlaceIds.has(selectedPlace.placeId)
                    ? "Saved"
                    : "+ Save"}
                </span>
              </button>
            )}

            {mode === "my_radar" && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(selectedPlace.placeId)}
                title="Remove this place from My Radar"
                className="flex items-center gap-1 text-xs font-black py-2 px-3 text-[#18181B] bg-[#FECDD3] hover:bg-rose-200 border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
