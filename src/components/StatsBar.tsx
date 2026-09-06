import React from "react";
import { Flame, Compass, Utensils, MapPin, Award } from "lucide-react";
import { PublicPlace, UserSavedPlace } from "../types";

interface StatsBarProps {
  myPlaces: UserSavedPlace[];
  publicPlaces: PublicPlace[];
  mode: "my_radar" | "community_pulse";
}

export const StatsBar: React.FC<StatsBarProps> = ({ myPlaces, publicPlaces, mode }) => {
  // Compute Top trending spot
  const sortedPublic = [...publicPlaces].sort((a, b) => b.saveCount - a.saveCount);
  const topTrending = sortedPublic[0];

  // Compute most frequent dish across public places
  const dishCounts: Record<string, number> = {};
  publicPlaces.forEach((p) => {
    (p.topDishes || []).forEach((d) => {
      dishCounts[d] = (dishCounts[d] || 0) + 1;
    });
  });
  const topDish = Object.entries(dishCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Gulai Sapi";

  // City counts
  const cityCounts: Record<string, number> = {};
  publicPlaces.forEach((p) => {
    if (p.city) cityCounts[p.city] = (cityCounts[p.city] || 0) + 1;
  });
  const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Jakarta Selatan";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Bento Tile 1: Koleksi Saya */}
      <div className="bg-white rounded-2xl p-4 border border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-black/20 transition-all flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-[#FF5C35] flex items-center justify-center shrink-0 border border-[#FF5C35]/20">
          <Compass className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-[#71716E] uppercase tracking-wider block">
            Koleksi Saya
          </span>
          <p className="text-lg font-black text-[#1A1A1A] tracking-tight leading-tight">
            {myPlaces.length} <span className="text-xs font-semibold text-[#71716E]">Tersimpan</span>
          </p>
        </div>
      </div>

      {/* Bento Tile 2: Viral #1 Komunitas */}
      <div className="bg-white rounded-2xl p-4 border border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-black/20 transition-all flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#FF5C35] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#FF5C35]/30">
          <Flame className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-[#71716E] uppercase tracking-wider block truncate">
              Trending #1
            </span>
            <span className="text-[10px] bg-[#FF5C35]/10 text-[#FF5C35] font-bold px-1.5 py-0.5 rounded-full">
              {topTrending ? `${topTrending.saveCount} saves` : "42 saves"}
            </span>
          </div>
          <p className="text-sm font-extrabold text-[#1A1A1A] truncate mt-0.5">
            {topTrending ? topTrending.name : "Gultik Blok M"}
          </p>
        </div>
      </div>

      {/* Bento Tile 3: Menu Paling Dicari */}
      <div className="bg-white rounded-2xl p-4 border border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-black/20 transition-all flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
          <Utensils className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-[#71716E] uppercase tracking-wider block truncate">
            Menu Paling Dicari
          </span>
          <p className="text-sm font-extrabold text-[#1A1A1A] truncate mt-0.5">{topDish}</p>
          <span className="text-[10px] text-[#71716E] font-medium">Banyak Direkomendasikan</span>
        </div>
      </div>

      {/* Bento Tile 4: Pusat Kuliner Teraktif */}
      <div className="bg-white rounded-2xl p-4 border border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-black/20 transition-all flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 border border-purple-500/20">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-[#71716E] uppercase tracking-wider block truncate">
            Pusat Kuliner Teraktif
          </span>
          <p className="text-sm font-extrabold text-[#1A1A1A] truncate mt-0.5">{topCity}</p>
          <span className="text-[10px] text-[#71716E] font-medium">Trending Area</span>
        </div>
      </div>
    </div>
  );
};
