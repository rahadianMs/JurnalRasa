import React, { useEffect, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { PublicPlace, UserSavedPlace, MapMode } from "../types";
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
          Menyiapkan Google Maps Platform...
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
          Kunci API Google Maps Belum Dikonfigurasi
        </h3>
        <p className="text-xs text-[#71716E] max-w-sm">
          Silakan tambahkan <code className="bg-black/[0.06] px-1.5 py-0.5 rounded text-[#1A1A1A] font-mono">GOOGLE_MAPS_API_KEY</code> pada pengaturan environment / rahasia proyek Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden border border-black/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)] bg-[#EBEBE8]">
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
                      className={`w-9 h-9 rounded-full ${
                        isSelected
                          ? "bg-emerald-600 ring-4 ring-emerald-300 scale-110 shadow-xl"
                          : "bg-emerald-500 hover:scale-105 shadow-md"
                      } text-white flex items-center justify-center transition-all`}
                    >
                      <Bookmark className="w-4 h-4 fill-white" />
                    </div>
                    <div className="absolute -bottom-1 w-2 h-2 bg-emerald-600 rotate-45"></div>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center cursor-pointer group">
                    <div
                      className={`w-10 h-10 rounded-full ${
                        isViral
                          ? "bg-gradient-to-tr from-red-600 via-orange-600 to-amber-500 ring-4 ring-orange-400/70 animate-pulse"
                          : saveCount >= 25
                          ? "bg-gradient-to-tr from-orange-600 to-amber-500 ring-2 ring-orange-300"
                          : "bg-amber-600"
                      } text-white shadow-xl flex flex-col items-center justify-center transition-all ${
                        isSelected ? "scale-125 ring-4 ring-stone-900" : "hover:scale-110"
                      }`}
                    >
                      <div className="flex items-center text-[10px] font-extrabold leading-none">
                        <span className="mr-0.5">🔥</span>
                        <span>{saveCount}</span>
                      </div>
                    </div>
                    {isViral && (
                      <div className="absolute -top-3 whitespace-nowrap bg-stone-900 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md border border-amber-300/30">
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
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md border border-black/[0.08] text-xs font-bold text-[#1A1A1A] flex items-center gap-2 pointer-events-none">
        {mode === "my_radar" ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Google Maps: Radar Privat ({places.length} Lokasi)</span>
          </>
        ) : (
          <>
            <Flame className="w-3.5 h-3.5 text-[#FF5C35]" />
            <span>Google Maps: Radar Komunitas ({places.length} Titik Kuliner)</span>
          </>
        )}
      </div>

      {/* Floating Selected Place Info Card (Bottom Center / Left) */}
      {selectedPlace && (
        <div className="absolute bottom-5 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm z-20 bg-white rounded-2xl p-4 shadow-xl border border-black/[0.08] animate-slide-up">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FF5C35]/10 text-[#FF5C35] px-2 py-0.5 rounded-full border border-[#FF5C35]/20">
                  {selectedPlace.city}
                </span>
                {"saveCount" in selectedPlace && (
                  <span className="text-[10px] font-bold bg-[#FF5C35]/10 text-[#FF5C35] px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#FF5C35]/20">
                    <Flame className="w-3 h-3 text-[#FF5C35]" />
                    {selectedPlace.saveCount} Disimpan
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-[#1A1A1A] mt-1 tracking-tight">
                {selectedPlace.name}
              </h3>
              <p className="text-xs text-[#71716E] line-clamp-1 mt-0.5">
                {selectedPlace.address}
              </p>
            </div>
            {selectedPlace.rating && (
              <div className="text-xs font-bold bg-amber-50 text-amber-900 px-2 py-1 rounded-lg border border-amber-200 flex items-center gap-0.5 shrink-0">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>{selectedPlace.rating}</span>
              </div>
            )}
          </div>

          {/* Dishes */}
          <div className="mt-2.5 pt-2 border-t border-black/[0.06]">
            <span className="text-[10px] font-bold text-[#71716E] uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Utensils className="w-3 h-3" /> Menu Rekomendasi
            </span>
            <div className="flex flex-wrap gap-1">
              {(
                ("recommendedDishes" in selectedPlace
                  ? selectedPlace.recommendedDishes
                  : (selectedPlace as PublicPlace).topDishes) || []
              ).map((d, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-black/[0.04] text-[#1A1A1A] border border-black/[0.04] font-medium px-2 py-0.5 rounded-md"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* Personal notes if available */}
          {"personalNotes" in selectedPlace && selectedPlace.personalNotes && (
            <div className="mt-2 text-xs bg-emerald-500/[0.07] text-emerald-950 p-2 rounded-lg border border-emerald-500/20 italic">
              "{selectedPlace.personalNotes}"
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 pt-2.5 border-t border-black/[0.06] flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 bg-[#1A1A1A] hover:bg-black text-white text-xs font-semibold py-2 px-3 rounded-xl transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Rute Maps</span>
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
                  title="Tonton Video Ulasan Asli di TikTok"
                  className="flex items-center gap-1.5 py-2 px-3 text-[#FF5C35] hover:text-[#E84A23] bg-[#FF5C35]/10 hover:bg-[#FF5C35]/20 border border-[#FF5C35]/20 rounded-xl transition-colors text-xs font-semibold shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Video Asli</span>
                </a>
              );
            })()}

            {mode === "community_pulse" && onSaveToMyRadar && (
              <button
                type="button"
                onClick={() => onSaveToMyRadar(selectedPlace as PublicPlace)}
                className={`flex items-center gap-1 text-xs font-semibold py-2 px-3 rounded-xl transition-colors shrink-0 ${
                  userSavedPlaceIds.has(selectedPlace.placeId)
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-[#FF5C35] hover:bg-[#E84A23] text-white shadow-sm"
                }`}
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>
                  {userSavedPlaceIds.has(selectedPlace.placeId)
                    ? "Tersimpan"
                    : "Simpan"}
                </span>
              </button>
            )}

            {mode === "my_radar" && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(selectedPlace.placeId)}
                title="Hapus tempat ini dari Radar Saya"
                className="flex items-center gap-1 text-xs font-semibold py-2 px-3 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-xl transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
