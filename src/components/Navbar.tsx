import React from "react";
import {
  Compass,
  Flame,
  Plus,
  LogIn,
  LogOut,
  User as UserIcon,
  Sparkles,
  MapPin,
  BookmarkCheck,
} from "lucide-react";
import { UserProfile, MapMode } from "../types";

interface NavbarProps {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
  onOpenCurator: () => void;
  user: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  mySavesCount: number;
  communityCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  onModeChange,
  onOpenCurator,
  user,
  onSignIn,
  onSignOut,
  mySavesCount,
  communityCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#F4F4F2]/90 backdrop-blur-md border-b border-black/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5C35] flex items-center justify-center text-white shadow-sm transition-transform hover:scale-105">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-[#1A1A1A]">
                  Rasa<span className="text-[#FF5C35]">Radar</span>
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#FF5C35]/10 text-[#FF5C35] tracking-wider border border-[#FF5C35]/20">
                  AI Curator
                </span>
              </div>
              <p className="text-[11px] text-[#71716E] hidden sm:block font-medium">
                Social Media Culinary Link to Community Map
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-black/[0.04] p-1 rounded-2xl border border-black/[0.06]">
            <button
              id="tab-my-radar"
              onClick={() => onModeChange("my_radar")}
              className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                mode === "my_radar"
                  ? "bg-white text-[#1A1A1A] shadow-sm border border-black/[0.06]"
                  : "text-[#71716E] hover:text-[#1A1A1A]"
              }`}
            >
              <BookmarkCheck className="w-4 h-4 text-emerald-600" />
              <span>Radar Saya</span>
              <span className="ml-0.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                {mySavesCount}
              </span>
            </button>

            <button
              id="tab-community-pulse"
              onClick={() => onModeChange("community_pulse")}
              className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                mode === "community_pulse"
                  ? "bg-white text-[#1A1A1A] shadow-sm border border-black/[0.06]"
                  : "text-[#71716E] hover:text-[#1A1A1A]"
              }`}
            >
              <Flame className="w-4 h-4 text-[#FF5C35] fill-[#FF5C35]/20" />
              <span>Peta Komunitas</span>
              <span className="ml-0.5 text-[10px] px-2 py-0.5 rounded-full bg-[#FF5C35]/10 text-[#FF5C35] font-bold">
                {communityCount}
              </span>
            </button>
          </div>

          {/* Action buttons & User profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-open-curator"
              onClick={onOpenCurator}
              className="flex items-center gap-2 bg-[#FF5C35] hover:bg-[#E84A23] text-white px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Kurasi Link Medsos</span>
              <span className="sm:hidden">Kurasi</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-200 hidden md:inline" />
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-black/[0.08]">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-8 h-8 rounded-full border border-black/[0.08] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-black/[0.06] text-[#1A1A1A] flex items-center justify-center font-bold text-xs border border-black/[0.06]">
                    {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block text-left max-w-[120px]">
                  <p className="text-xs font-semibold text-[#1A1A1A] truncate">
                    {user.displayName || "Food Explorer"}
                  </p>
                  <p className="text-[10px] text-[#71716E] truncate">
                    {user.isAnonymous ? "Akun Tamu" : user.email || "Verified"}
                  </p>
                </div>
                <button
                  id="btn-sign-out"
                  onClick={onSignOut}
                  title="Keluar Akun"
                  className="p-1.5 text-[#71716E] hover:text-[#1A1A1A] hover:bg-black/[0.04] rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="btn-sign-in"
                onClick={onSignIn}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1A1A1A] hover:bg-black/[0.06] bg-black/[0.04] border border-black/[0.08] px-3.5 py-2 rounded-xl transition-colors"
              >
                <LogIn className="w-4 h-4 text-[#71716E]" />
                <span className="hidden sm:inline">Masuk</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
