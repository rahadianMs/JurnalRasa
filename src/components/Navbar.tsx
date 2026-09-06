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
  Map,
  MessageSquare,
  PenLine,
  Link2,
} from "lucide-react";
import { UserProfile, AppTab } from "../types";

interface NavbarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onOpenCurator: () => void;
  onOpenQuickManual: () => void;
  user: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  mySavesCount: number;
  communityCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenCurator,
  onOpenQuickManual,
  user,
  onSignIn,
  onSignOut,
  mySavesCount,
  communityCount,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#FFFDF7] border-b-[2.5px] border-[#18181B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Logo & Brand - Neo-Brutalist Food Notebook */}
          <div
            onClick={() => onTabChange("journal")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FFFDF7] border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] overflow-hidden flex items-center justify-center p-0.5 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[3.5px_3.5px_0px_#18181B] group-active:translate-x-0.5 group-active:translate-y-0.5 group-active:shadow-[1px_1px_0px_#18181B]">
              <img
                src="/brand/jr-logo-minimal-cute-v4.png"
                alt="Jurnal Rasa Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight font-display text-[#18181B]">
                  Jurnal<span className="text-[#FF5533]">Rasa</span>
                </span>
              </div>
              <p className="text-[11px] text-[#71716E] hidden sm:block font-handwriting font-bold -mt-0.5">
                culinary notes & taste radar
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs (Desktop) - Neo-brutalist pill buttons */}
          <div className="hidden md:flex items-center bg-[#F7F4EA] p-1.5 rounded-xl border-2 border-[#18181B] gap-1.5 shadow-[2px_2px_0px_#18181B]">
            {/* Taste Journal Tab (Primary - includes notes & AI Finder) */}
            <button
              id="tab-journal"
              onClick={() => onTabChange("journal")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all border-2 cursor-pointer ${
                activeTab === "journal" || activeTab === "copilot"
                  ? "bg-[#BBF7D0] text-[#18181B] border-[#18181B] shadow-[2px_2px_0px_#18181B]"
                  : "border-transparent text-[#52525B] hover:text-[#18181B] hover:bg-black/[0.04]"
              }`}
            >
              <BookmarkCheck className="w-4 h-4 text-emerald-800" />
              <span>Taste Journal</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#18181B] border border-[#18181B] font-black font-mono-code">
                {mySavesCount}
              </span>
            </button>

            {/* Peta Rasa / Taste Map Tab */}
            <button
              id="tab-map"
              onClick={() => onTabChange("map")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all border-2 ${
                activeTab === "map"
                  ? "bg-[#BAE6FD] text-[#18181B] border-[#18181B] shadow-[2px_2px_0px_#18181B]"
                  : "border-transparent text-[#52525B] hover:text-[#18181B] hover:bg-black/[0.04]"
              }`}
            >
              <Map className="w-4 h-4 text-blue-800" />
              <span>Taste Map</span>
            </button>

            {/* Jelajah Rasa / Explore Taste Tab */}
            <button
              id="tab-community"
              onClick={() => onTabChange("community")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all border-2 ${
                activeTab === "community"
                  ? "bg-[#FF99C8] text-[#18181B] border-[#18181B] shadow-[2px_2px_0px_#18181B]"
                  : "border-transparent text-[#52525B] hover:text-[#18181B] hover:bg-black/[0.04]"
              }`}
            >
              <Flame className="w-4 h-4 text-rose-700" />
              <span>Explore Taste</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#18181B] border border-[#18181B] font-black font-mono-code">
                {communityCount}
              </span>
            </button>
          </div>

          {/* Action buttons & User profile */}
          <div className="flex items-center gap-2.5">
            {/* Quick Actions */}
            <button
              id="btn-open-curator"
              onClick={onOpenCurator}
              className="flex items-center gap-1.5 bg-[#FF5533] hover:bg-[#ff4420] text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_#18181B] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181B] cursor-pointer"
              title="Quick save food spots from TikTok or Instagram links"
            >
              <Link2 className="w-4 h-4 stroke-[2.5]" />
              <span>Quick Save</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 hidden md:inline" />
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l-2 border-[#18181B]">
                {user.isAnonymous ? (
                  <div className="flex items-center gap-1.5">
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-[#FEF08A] text-[#18181B] border border-[#18181B] font-mono-code">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Guest Mode
                    </span>
                    <button
                      onClick={onSignIn}
                      className="text-xs font-black px-2 sm:px-2.5 py-1 rounded-lg bg-[#BBF7D0] hover:bg-[#86efac] text-[#18181B] border border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 whitespace-nowrap cursor-pointer"
                      title="Save notes permanently to your Google account"
                    >
                      <span className="hidden sm:inline">Connect </span>Google
                    </button>
                  </div>
                ) : (
                  <>
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="w-8 h-8 rounded-lg border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#FEF08A] text-[#18181B] flex items-center justify-center font-black text-xs border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]">
                        {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="hidden lg:block text-left max-w-[120px]">
                      <p className="text-xs font-bold text-[#18181B] truncate">
                        {user.displayName || "Food Explorer"}
                      </p>
                      <p className="text-[10px] text-[#71716E] truncate font-mono-code font-semibold">
                        {user.email || "Google Verified"}
                      </p>
                    </div>
                  </>
                )}
                <button
                  id="btn-sign-out"
                  onClick={onSignOut}
                  title={user.isAnonymous ? "Sign out and reset guest session" : "Sign out from account"}
                  className="p-1.5 text-[#18181B] hover:bg-rose-100 border border-transparent hover:border-[#18181B] rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span className="hidden xl:inline text-rose-700">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                id="btn-sign-in"
                onClick={onSignIn}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#18181B] bg-[#FEF08A] hover:bg-[#fde047] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] px-3.5 py-2 rounded-xl transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#18181B] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181B]"
              >
                <LogIn className="w-4 h-4 text-[#18181B]" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
