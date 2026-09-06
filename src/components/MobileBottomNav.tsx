import React from "react";
import { BookmarkCheck, Map, Flame } from "lucide-react";
import { AppTab } from "../types";

interface MobileBottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  journalCount: number;
  communityCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  journalCount,
  communityCount,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF7] border-t-[2.5px] border-[#18181B] px-3 py-1.5 shadow-[0_-3px_0px_#18181B]">
      <div className="flex items-center justify-around max-w-md mx-auto gap-2">
        {/* Taste Journal Tab (Includes Notes & AI Finder) */}
        <button
          onClick={() => onSelectTab("journal")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl border-2 transition-all cursor-pointer ${
            activeTab === "journal" || activeTab === "copilot"
              ? "bg-[#BBF7D0] border-[#18181B] text-[#18181B] shadow-[2px_2px_0px_#18181B] font-extrabold"
              : "border-transparent text-[#52525B] font-bold hover:bg-black/[0.03]"
          }`}
        >
          <div className="relative">
            <BookmarkCheck className="w-5 h-5 text-emerald-800" />
            {journalCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-[#FF5533] text-white text-[9px] font-black rounded px-1 py-0 font-mono-code border border-[#18181B]">
                {journalCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight">Taste Journal</span>
        </button>

        {/* Peta Rasa / Taste Map Tab */}
        <button
          onClick={() => onSelectTab("map")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl border-2 transition-all ${
            activeTab === "map"
              ? "bg-[#BAE6FD] border-[#18181B] text-[#18181B] shadow-[2px_2px_0px_#18181B] font-extrabold"
              : "border-transparent text-[#52525B] font-bold hover:bg-black/[0.03]"
          }`}
        >
          <Map className="w-5 h-5 text-blue-800" />
          <span className="text-[11px] tracking-tight">Taste Map</span>
        </button>

        {/* Jelajah Rasa / Explore Taste Tab */}
        <button
          onClick={() => onSelectTab("community")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl border-2 transition-all ${
            activeTab === "community"
              ? "bg-[#FF99C8] border-[#18181B] text-[#18181B] shadow-[2px_2px_0px_#18181B] font-extrabold"
              : "border-transparent text-[#52525B] font-bold hover:bg-black/[0.03]"
          }`}
        >
          <div className="relative">
            <Flame className="w-5 h-5 text-rose-700" />
            {communityCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-[#18181B] text-white text-[9px] font-black rounded px-1 py-0 font-mono-code border border-[#18181B]">
                {communityCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight">Explore Taste</span>
        </button>
      </div>
    </nav>
  );
};
