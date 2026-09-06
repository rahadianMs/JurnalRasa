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
      {/* Bento Tile 1: My Collection */}
      <div className="bg-[#FFFDF7] rounded-2xl p-4 border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#FEF08A] text-[#18181B] flex items-center justify-center shrink-0 border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] font-black">
          <Compass className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black text-[#71716E] uppercase tracking-wider block font-mono-code">
            My Collection
          </span>
          <p className="text-lg font-black font-display text-[#18181B] tracking-tight leading-tight">
            {myPlaces.length} <span className="text-xs font-bold text-[#52525B]">Saved</span>
          </p>
        </div>
      </div>

      {/* Bento Tile 2: Viral #1 Trending */}
      <div className="bg-[#FEF08A] rounded-2xl p-4 border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#FF5533] text-white flex items-center justify-center shrink-0 border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]">
          <Flame className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-black text-[#18181B] uppercase tracking-wider block truncate font-mono-code">
              #1 Trending
            </span>
            <span className="text-[9px] bg-[#18181B] text-[#FEF08A] font-black px-1.5 py-0.5 rounded font-mono-code">
              {topTrending ? `${topTrending.saveCount} saves` : "42 saves"}
            </span>
          </div>
          <p className="text-sm font-black font-display text-[#18181B] truncate mt-0.5">
            {topTrending ? topTrending.name : "Gultik Blok M"}
          </p>
        </div>
      </div>

      {/* Bento Tile 3: Most Wanted Dish */}
      <div className="bg-[#BAE6FD] rounded-2xl p-4 border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-white text-[#18181B] flex items-center justify-center shrink-0 border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]">
          <Utensils className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black text-[#18181B] uppercase tracking-wider block truncate font-mono-code">
            Most Wanted Dish
          </span>
          <p className="text-sm font-black font-display text-[#18181B] truncate mt-0.5">{topDish}</p>
          <span className="text-[10px] text-[#18181B] font-bold font-handwriting">Popular recommendation</span>
        </div>
      </div>

      {/* Bento Tile 4: Top Culinary Hub */}
      <div className="bg-[#FFD6A5] rounded-2xl p-4 border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-white text-[#18181B] flex items-center justify-center shrink-0 border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]">
          <MapPin className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black text-[#18181B] uppercase tracking-wider block truncate font-mono-code">
            Top Culinary Hub
          </span>
          <p className="text-sm font-black font-display text-[#18181B] truncate mt-0.5">{topCity}</p>
          <span className="text-[10px] text-[#18181B] font-bold font-handwriting">Active foodie area</span>
        </div>
      </div>
    </div>
  );
};
