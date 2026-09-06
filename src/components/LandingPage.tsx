import React, { useState } from "react";
import {
  Sparkles,
  BookOpen,
  MapPin,
  Compass,
  Link2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Loader2,
  MessageSquare,
  Utensils,
  Lock,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface LandingPageProps {
  onGoogleSignIn: () => Promise<void>;
  onGuestSignIn: () => Promise<void>;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoogleSignIn,
  onGuestSignIn,
}) => {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const handleGoogle = async () => {
    try {
      setAuthError(null);
      setUnauthorizedDomain(null);
      setLoadingGoogle(true);
      await onGoogleSignIn();
    } catch (err: any) {
      if (
        err?.code === "auth/unauthorized-domain" ||
        err?.message?.includes("unauthorized-domain")
      ) {
        const domain = typeof window !== "undefined" ? window.location.hostname : "";
        setUnauthorizedDomain(domain);
      } else if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request"
      ) {
        // User closed popup; normal cancellation
      } else {
        console.warn("Google login notice:", err);
        setAuthError(err?.message || "Failed to sign in with Google. Please try again.");
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleGuest = async () => {
    try {
      setAuthError(null);
      setUnauthorizedDomain(null);
      setLoadingGuest(true);
      await onGuestSignIn();
    } catch (err: any) {
      console.warn("Guest login notice:", err);
      setAuthError("Failed to enter guest mode. Please try again.");
    } finally {
      setLoadingGuest(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EA] text-[#18181B] flex flex-col selection:bg-[#FF5533] selection:text-white">
      {/* Top Brand Bar */}
      <header className="border-b-2 border-[#18181B] bg-[#FFFDF7] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFDF7] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] overflow-hidden flex items-center justify-center p-0.5">
              <img
                src="/brand/jr-logo-minimal-cute-v4.png"
                alt="Jurnal Rasa Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight font-display text-[#18181B]">
                  Jurnal Rasa
                </span>
                <span className="hidden sm:inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FEF08A] text-[#18181B] border border-[#18181B] font-mono-code uppercase">
                  Nusantara Edition
                </span>
              </div>
              <p className="text-[11px] text-[#52525B] font-handwriting -mt-0.5">
                Personal Culinary Notebook & Food Radar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleGuest}
              disabled={loadingGuest || loadingGoogle}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-xl border-2 border-[#18181B] bg-white hover:bg-[#FEF08A] text-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
            >
              {loadingGuest ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Entering...</span>
                </span>
              ) : (
                <span>Guest Mode</span>
              )}
            </button>
            <button
              onClick={handleGoogle}
              disabled={loadingGoogle || loadingGuest}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-black rounded-xl border-2 border-[#18181B] bg-[#FF5533] hover:bg-[#ff4420] text-white shadow-[2px_2px_0px_#18181B] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loadingGoogle ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
                </svg>
              )}
              <span>Sign In with Google</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
        {/* Error Alert if any */}
        {authError && (
          <div className="p-4 bg-[#FECDD3] border-2 border-[#18181B] rounded-2xl shadow-[3px_3px_0px_#18181B] flex items-center gap-3 text-xs sm:text-sm font-bold">
            <span className="text-red-700 font-black">!</span>
            <span>{authError}</span>
          </div>
        )}

        {/* Domain Authorization Guidance if Google OAuth is restricted by Firebase domain settings */}
        {unauthorizedDomain && (
          <div className="p-5 bg-[#FEF08A] border-2 border-[#18181B] rounded-2xl shadow-[4px_4px_0px_#18181B] space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF5533] text-white flex items-center justify-center font-black text-sm border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
                  !
                </div>
                <div>
                  <h3 className="text-sm font-black font-display text-[#18181B]">
                    Domain Not Registered in Firebase Authorized Domains
                  </h3>
                  <p className="text-xs text-[#52525B] font-mono-code font-bold">
                    Firebase Google OAuth Security Setting
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUnauthorizedDomain(null)}
                className="text-xs font-mono-code font-bold text-[#52525B] hover:text-[#18181B] px-2.5 py-1 bg-white/80 hover:bg-white rounded-lg border border-[#18181B] cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <p className="text-xs text-[#18181B] font-medium leading-relaxed">
              Google Sign-In requires the current preview domain (
              <code className="bg-white px-1.5 py-0.5 rounded border border-[#18181B] font-mono-code font-black text-[#FF5533]">
                {unauthorizedDomain}
              </code>
              ) to be added under <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(unauthorizedDomain);
                  setCopiedDomain(true);
                  setTimeout(() => setCopiedDomain(false), 2500);
                }}
                className="px-3 py-2 bg-white hover:bg-stone-50 text-[#18181B] border-2 border-[#18181B] rounded-xl text-xs font-black shadow-[2px_2px_0px_#18181B] flex items-center gap-1.5 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer"
              >
                {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDomain ? "Domain Name Copied!" : "Copy Domain Name"}</span>
              </button>

              <a
                href="https://console.firebase.google.com/project/project-8a555d88-9bc4-463d-ab2/authentication/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-white hover:bg-stone-50 text-[#18181B] border-2 border-[#18181B] rounded-xl text-xs font-bold shadow-[2px_2px_0px_#18181B] flex items-center gap-1.5 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Firebase Console Settings ↗</span>
              </a>

              <button
                onClick={handleGuest}
                className="px-3.5 py-2 bg-[#18181B] hover:bg-black text-[#FFFDF7] border-2 border-[#18181B] rounded-xl text-xs font-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ml-auto cursor-pointer"
              >
                <span>Continue via Guest Mode ➔</span>
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="relative bg-[#FFFDF7] border-[3px] border-[#18181B] rounded-3xl p-6 sm:p-10 shadow-[6px_6px_0px_#18181B]">
          {/* Notebook Pin Washi Tape Sticker - Positioned on card border but below sticky navbar (z-10 < z-50) */}
          <div className="absolute -top-3.5 right-6 sm:right-8 z-10 bg-[#FEF08A] text-[#18181B] text-[11px] font-black font-mono-code px-3.5 py-1 rounded-sm border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] rotate-2 select-none uppercase tracking-wider">
            ★ NUSANTARA EDITION
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
              {/* Category Badge & Subheading */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="inline-flex items-center gap-2 bg-[#BAE6FD] border-2 border-[#18181B] px-3 py-1 rounded-xl shadow-[2px_2px_0px_#18181B] text-xs font-black font-mono-code">
                  <Sparkles className="w-3.5 h-3.5 text-[#18181B]" />
                  <span>SMART SOCIAL MEDIA FOOD NOTEBOOK</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-[#52525B] font-handwriting">
                  TikTok & Reels Culinary Radar
                </span>
              </div>

              {/* Large Brand Mascot Hook directly beside the Headline */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 pt-1">
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-2xl sm:rounded-3xl bg-[#FFFDF7] border-[3px] border-[#18181B] shadow-[5px_5px_0px_#18181B] p-2.5 flex items-center justify-center transition-all duration-300 group-hover:-rotate-3 group-hover:scale-105 group-hover:shadow-[7px_7px_0px_#18181B] cursor-pointer">
                    <img
                      src="/brand/jr-logo-minimal-cute-v4.png"
                      alt="Jurnal Rasa Official Logo"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute -bottom-2.5 -right-1.5 bg-[#FEF08A] text-[#18181B] text-[10px] font-black px-2 py-0.5 rounded-md border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] font-mono-code uppercase select-none tracking-wide">
                    ★ Jurnal Rasa
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-[38px] font-black font-display tracking-tight text-[#18181B] leading-[1.18] flex-1">
                  Turn Social Media Food Links into Your Personal Culinary Journal & Map
                </h1>
              </div>

              <p className="text-sm sm:text-base text-[#52525B] leading-relaxed font-medium">
                Always finding appetizing food spots on TikTok & Reels but forgetting their names? Paste the links here:
                Gemini AI detects restaurant details, signature dishes, and maps them to your personal food radar.
              </p>

              {/* Login Decision Card */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Google OAuth */}
                <div className="bg-white p-4 rounded-2xl border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-black font-mono-code text-[#18181B]">
                      <ShieldCheck className="w-4 h-4 text-[#FF5533]" />
                      <span>PERMANENT CLOUD ACCOUNT</span>
                    </div>
                    <p className="text-xs text-[#52525B] mt-1 font-medium">
                      Save taste notes permanently to Google Cloud Firestore, secure & isolated per user.
                    </p>
                  </div>
                  <button
                    id="btn-landing-google-login"
                    onClick={handleGoogle}
                    disabled={loadingGoogle || loadingGuest}
                    className="w-full py-3 px-4 rounded-xl border-2 border-[#18181B] bg-[#FF5533] hover:bg-[#ff4420] text-white text-xs font-black shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {loadingGoogle ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
                      </svg>
                    )}
                    <span>Sign In with Google</span>
                  </button>
                </div>

                {/* Option 2: Guest Mode */}
                <div className="bg-white p-4 rounded-2xl border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-black font-mono-code text-[#18181B]">
                      <Compass className="w-4 h-4 text-amber-600" />
                      <span>INSTANT GUEST SESSION</span>
                    </div>
                    <p className="text-xs text-[#52525B] mt-1 font-medium">
                      Explore features immediately with preloaded sample data and full notebook functionality.
                    </p>
                  </div>
                  <button
                    id="btn-landing-guest-login"
                    onClick={handleGuest}
                    disabled={loadingGuest || loadingGoogle}
                    className="w-full py-3 px-4 rounded-xl border-2 border-[#18181B] bg-[#FEF08A] hover:bg-[#fde047] text-[#18181B] text-xs font-black shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {loadingGuest ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>Try Guest Mode</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Preview Bento Card */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-3.5">
              {/* Preview 1: Taste Card */}
              <div className="p-4 bg-[#FFFDF7] rounded-2xl border-2 border-[#18181B] shadow-[4px_4px_0px_#18181B] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#BBF7D0] text-[#18181B] border border-[#18181B] font-mono-code">
                    PARSED FROM TIKTOK
                  </span>
                  <span className="text-xs font-bold text-[#FF5533]">★ 4.8</span>
                </div>
                <div>
                  <h3 className="text-sm font-black font-display text-[#18181B]">
                    Gultik Barito & Blok M
                  </h3>
                  <p className="text-xs text-[#52525B] font-medium">Kebayoran Baru, South Jakarta</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] font-bold bg-[#FEF08A] px-2 py-0.5 rounded-lg border border-[#18181B]">
                    Beef Gulai Soup
                  </span>
                  <span className="text-[11px] font-bold bg-white px-2 py-0.5 rounded-lg border border-[#18181B]">
                    Prawn Crackers
                  </span>
                </div>
                <p className="text-xs text-[#18181B] bg-[#F7F4EA] p-2 rounded-xl border border-[#18181B] font-handwriting">
                  "Rich and savory broth, tender beef cuts. A classic late-night culinary spot in South Jakarta!"
                </p>
              </div>

              {/* Preview 2: Taste Finder Snippet (Stretched proportionally to align with bottom of left cards) */}
              <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 bg-[#E0F2FE] rounded-2xl border-2 border-[#18181B] shadow-[4px_4px_0px_#18181B] space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#FF5533] border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] flex items-center justify-center text-white shrink-0">
                        <Sparkles className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-[#18181B] font-display block leading-none">
                          Taste Finder Copilot
                        </span>
                        <span className="text-[10px] text-[#52525B] font-mono-code font-bold">
                          Personal Culinary AI
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono-code font-black px-2 py-0.5 rounded bg-[#FEF08A] text-[#18181B] border border-[#18181B]">
                      AI ASSISTANT
                    </span>
                  </div>

                  <p className="text-xs sm:text-[13px] text-[#18181B] font-medium leading-relaxed bg-white/60 p-2.5 rounded-xl border border-[#18181B]/15">
                    "Based on your saved places, you have options for savory street food at Barito or specialty coffee in Cilandak!"
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-bold bg-white text-[#18181B] px-2 py-0.5 rounded-md border border-[#18181B] shadow-[1px_1px_0px_#18181B]">
                      🍲 Similar to Barito
                    </span>
                    <span className="text-[10px] font-bold bg-white text-[#18181B] px-2 py-0.5 rounded-md border border-[#18181B] shadow-[1px_1px_0px_#18181B]">
                      ☕ Coffee Spots
                    </span>
                  </div>
                </div>

                <div className="text-[10px] font-mono-code text-[#52525B] flex items-center gap-1.5 font-bold pt-2 border-t border-[#18181B]/15">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Grounded strictly in your personal taste journal</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black font-display text-[#18181B]">
              Everything You Need for Your Culinary Journey
            </h2>
            <p className="text-xs sm:text-sm text-[#52525B] font-medium">
              Designed with neo-brutalist notebook craftsmanship, Google Maps Platform precision, and Gemini AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="bg-[#FFFDF7] p-6 rounded-3xl border-[2.5px] border-[#18181B] shadow-[4px_4px_0px_#18181B] space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FF99C8] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-center text-[#18181B]">
                <Link2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-black font-display text-[#18181B]">
                Quick Save
              </h3>
              <p className="text-xs text-[#52525B] font-medium leading-relaxed">
                Paste TikTok or Instagram Reels links. Gemini AI extracts restaurant names, signature dishes, visual cues, and Google Maps coordinates automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#FFFDF7] p-6 rounded-3xl border-[2.5px] border-[#18181B] shadow-[4px_4px_0px_#18181B] space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-[#BAE6FD] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-center text-[#18181B]">
                <MapPin className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-black font-display text-[#18181B]">
                Interactive Taste Map
              </h3>
              <p className="text-xs text-[#52525B] font-medium leading-relaxed">
                Visualize all your saved wishlist spots and visited food gems on an interactive Google Maps Platform canvas with custom neo-brutalist pins.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#FFFDF7] p-6 rounded-3xl border-[2.5px] border-[#18181B] shadow-[4px_4px_0px_#18181B] space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FEF08A] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-center text-[#18181B]">
                <MessageSquare className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-black font-display text-[#18181B]">
                Taste Finder AI Copilot
              </h3>
              <p className="text-xs text-[#52525B] font-medium leading-relaxed">
                Ask for dinner ideas, build custom 1-day food itineraries, and get personalized recommendations grounded directly in your saved taste journal entries.
              </p>
            </div>
          </div>
        </section>

        {/* Security & Privacy Commitment Banner */}
        <section className="bg-[#FFFDF7] border-2 border-[#18181B] rounded-3xl p-6 shadow-[4px_4px_0px_#18181B]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#BBF7D0] border-2 border-[#18181B] flex items-center justify-center text-[#18181B] shrink-0">
                <Lock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-black font-display text-[#18181B]">
                  Guaranteed Data Isolation & Zero Cross-User Leakage
                </h4>
                <p className="text-xs text-[#52525B] font-medium">
                  Your taste notes are protected by strict per-UID Firestore security rules. Guest sessions can be reset at any time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGoogle}
                disabled={loadingGoogle || loadingGuest}
                className="px-4 py-2 bg-[#FF5533] text-white text-xs font-black rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] hover:bg-[#ff4420] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer"
              >
                Get Started
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#18181B] bg-[#FFFDF7] py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#52525B] font-medium">
          <div className="flex items-center gap-2">
            <span className="font-black font-display text-[#18181B] text-sm">Jurnal Rasa</span>
            <span>•</span>
            <span className="font-handwriting text-sm text-[#18181B]">Personal Culinary Notebook & Food Radar</span>
          </div>
          <div className="text-[11px] font-mono-code text-[#71716E]">
            <span>Save food recommendations effortlessly and never lose a spot again</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
