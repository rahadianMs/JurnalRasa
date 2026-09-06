import React, { useState } from "react";
import {
  X,
  Sparkles,
  Link as LinkIcon,
  AlertCircle,
  MapPin,
  Utensils,
  Tag,
  DollarSign,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  Edit2,
  CheckSquare,
  Square,
  Layers,
  Navigation,
  Eye,
} from "lucide-react";
import { CulinaryParseResult, ParseApiResponse } from "../types";
import { getGoogleMapsUrl } from "../lib/maps";

interface CuratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (place: CulinaryParseResult, personalNotes: string) => Promise<void>;
  onSaveMultiple?: (places: Array<{ parsed: CulinaryParseResult; personalNotes: string }>) => Promise<void>;
}

export interface UrlSanitizationState {
  isValid: boolean;
  type: "tiktok" | "instagram" | "unsupported" | "invalid" | "empty";
  sanitizedUrl: string;
  feedbackMessage?: string;
}

// Client-side sanitizer & strict URL validator (anti-SSRF, anti-XSS, domain whitelist)
function validateAndSanitizeSocialUrl(raw: string): UrlSanitizationState {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return { isValid: false, type: "empty", sanitizedUrl: "" };
  }

  const trimmed = raw.trim();

  // Length check (prevent memory DoS)
  if (trimmed.length > 2048) {
    return {
      isValid: false,
      type: "invalid",
      sanitizedUrl: "",
      feedbackMessage: "Tautan terlalu panjang (maksimum 2048 karakter).",
    };
  }

  // Reject malicious schemes, script injections, tags, control chars
  if (
    /^(javascript|data|vbscript|file|about|blob|ftp|mailto):/i.test(trimmed) ||
    /[<>"'{}\x00-\x1F\x7F]/.test(trimmed)
  ) {
    return {
      isValid: false,
      type: "invalid",
      sanitizedUrl: "",
      feedbackMessage: "Tautan mengandung karakter atau skema berbahaya yang dilarang.",
    };
  }

  let urlToTest = trimmed;
  if (!/^https?:\/\//i.test(urlToTest)) {
    urlToTest = "https://" + urlToTest;
  }

  try {
    const parsed = new URL(urlToTest);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return {
        isValid: false,
        type: "invalid",
        sanitizedUrl: "",
        feedbackMessage: "Only standard web protocols (HTTPS/HTTP) are allowed.",
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block private networks, loopbacks, cloud metadata, raw IPs
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "169.254.169.254" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.3") ||
      /^[0-9.]+$/.test(hostname) ||
      hostname.includes(":")
    ) {
      return {
        isValid: false,
        type: "invalid",
        sanitizedUrl: "",
        feedbackMessage: "IP addresses and local networks are disallowed for security reasons.",
      };
    }

    const isTikTok =
      hostname === "tiktok.com" ||
      hostname.endsWith(".tiktok.com");

    const isInstagram =
      hostname === "instagram.com" ||
      hostname.endsWith(".instagram.com") ||
      hostname === "instagr.am" ||
      hostname === "ig.me";

    if (isTikTok) {
      return {
        isValid: true,
        type: "tiktok",
        sanitizedUrl: parsed.toString(),
        feedbackMessage: "Verified TikTok link ready to parse.",
      };
    }

    if (isInstagram) {
      return {
        isValid: true,
        type: "instagram",
        sanitizedUrl: parsed.toString(),
        feedbackMessage: "Verified Instagram link ready to parse.",
      };
    }

    return {
      isValid: false,
      type: "unsupported",
      sanitizedUrl: "",
      feedbackMessage: "Only official links from TikTok or Instagram are supported.",
    };
  } catch {
    return {
      isValid: false,
      type: "invalid",
      sanitizedUrl: "",
      feedbackMessage: "Invalid link format. Please ensure the TikTok or Instagram link is valid.",
    };
  }
}

// Sanitize user note: strips HTML tags and control chars, caps length
function sanitizeUserNote(raw: string): string {
  return raw
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, 1000);
}

export const CuratorModal: React.FC<CuratorModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  onSaveMultiple,
}) => {
  const [url, setUrl] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [isEditingSingle, setIsEditingSingle] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [reasoningStep, setReasoningStep] = useState<ParseApiResponse["reasoningStep"] | null>(null);
  const [showReasoningDetails, setShowReasoningDetails] = useState(false);

  // Multi-place support state
  const [extractedPlaces, setExtractedPlaces] = useState<CulinaryParseResult[]>([]);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
  const [notesPerPlace, setNotesPerPlace] = useState<Record<string, string>>({});
  const [isMultiPlace, setIsMultiPlace] = useState(false);

  // Real-time validation computation
  const urlValidation = validateAndSanitizeSocialUrl(url);

  if (!isOpen) return null;

  const handleReset = () => {
    setUrl("");
    setPersonalNotes("");
    setError(null);
    setFallbackNotice(null);
    setIsEditingSingle(false);
    setEditingPlaceId(null);
    setExtractedPlaces([]);
    setSelectedPlaceIds(new Set());
    setNotesPerPlace({});
    setIsMultiPlace(false);
    setReasoningStep(null);
    setShowReasoningDetails(false);
  };

  const handleExtractWithAI = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Strict client-side validation check
    const validation = validateAndSanitizeSocialUrl(url);
    if (!validation.isValid) {
      setError(validation.feedbackMessage || "Please provide an official public link from TikTok or Instagram.");
      return;
    }

    const cleanNotes = sanitizeUserNote(personalNotes);

    setLoading(true);
    setError(null);
    setFallbackNotice(null);
    setReasoningStep(null);
    setShowReasoningDetails(false);

    try {
      const response = await fetch("/api/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: validation.sanitizedUrl,
          personalNotes: cleanNotes,
        }),
      });

      const res = await response.json();

      if (!res.success) {
        setError(res.message || res.error || "Could not automatically extract spots from this link. Please ensure the link is public.");
        return;
      }

      const places: CulinaryParseResult[] = res.places || (res.data ? [res.data] : []);
      if (places.length === 0) {
        setError("No culinary spots could be detected from this post. Please verify the URL.");
        return;
      }

      setExtractedPlaces(places);
      if (res.reasoningStep) {
        setReasoningStep(res.reasoningStep);
      }
      const isMulti = res.isMultiPlace || places.length > 1;
      setIsMultiPlace(isMulti);
      setSelectedPlaceIds(new Set(places.map((p) => p.placeId)));

      // Initialize notes per place
      const notesMap: Record<string, string> = {};
      places.forEach((p) => {
        notesMap[p.placeId] = cleanNotes || "";
      });
      setNotesPerPlace(notesMap);

      if (res.isFallback && res.fallbackNotice) {
        setFallbackNotice(res.fallbackNotice);
      }
    } catch (err: any) {
      console.error("AI parse request failed:", err);
      setError("Failed to connect to extraction server. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const togglePlaceSelection = (placeId: string) => {
    setSelectedPlaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPlaceIds.size === extractedPlaces.length) {
      setSelectedPlaceIds(new Set());
    } else {
      setSelectedPlaceIds(new Set(extractedPlaces.map((p) => p.placeId)));
    }
  };

  const handleUpdatePlaceField = (placeId: string, field: keyof CulinaryParseResult, value: any) => {
    setExtractedPlaces((prev) =>
      prev.map((p) => (p.placeId === placeId ? { ...p, [field]: value } : p))
    );
  };

  const handleCommitSave = async () => {
    if (extractedPlaces.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      if (isMultiPlace && extractedPlaces.length > 1) {
        const placesToSave = extractedPlaces.filter((p) => selectedPlaceIds.has(p.placeId));
        if (placesToSave.length === 0) {
          setError("Please select at least one culinary spot to save.");
          setSaving(false);
          return;
        }

        if (onSaveMultiple) {
          const payload = placesToSave.map((p) => ({
            parsed: p,
            personalNotes: notesPerPlace[p.placeId] || personalNotes || "",
          }));
          await Promise.race([
            onSaveMultiple(payload),
            new Promise((resolve) => setTimeout(resolve, 4000)),
          ]);
        } else {
          // Fallback sequential save
          for (const p of placesToSave) {
            await onSaveSuccess(p, notesPerPlace[p.placeId] || personalNotes || "");
          }
        }
      } else {
        // Single place save
        const target = extractedPlaces[0];
        await Promise.race([
          onSaveSuccess(target, personalNotes || notesPerPlace[target.placeId] || ""),
          new Promise((resolve) => setTimeout(resolve, 3500)),
        ]);
      }

      handleReset();
      onClose();
    } catch (err: any) {
      console.error("Failed to commit place:", err);
      handleReset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FFFDF7] rounded-2xl sm:rounded-3xl shadow-[6px_6px_0px_#18181B] sm:shadow-[8px_8px_0px_#18181B] border-[2.5px] sm:border-[3px] border-[#18181B] w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Neo-brutalist Notebook Title Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b-[2.5px] border-[#18181B] bg-[#F7F4EA] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-center font-black shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black font-display text-[#18181B] tracking-tight">
                  Quick Save
                </h2>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FF99C8] text-[#18181B] border border-[#18181B] font-mono-code uppercase whitespace-nowrap">
                  TikTok & Instagram
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#52525B] font-medium font-handwriting truncate sm:whitespace-normal">
                Found an amazing food spot on social media? Paste the link here to record it cleanly and never lose it!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center text-[#18181B] bg-white hover:bg-[#FECDD3] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer shrink-0 ml-2"
            aria-label="Close Quick Save Modal"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {/* Input Form */}
          {extractedPlaces.length === 0 ? (
            <form onSubmit={handleExtractWithAI} className="space-y-4">
              {/* URL Input */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                  <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider font-mono-code">
                    TikTok Video or Instagram Reels Link
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-[#BBF7D0] border border-[#18181B] px-1.5 py-0.2 rounded font-mono-code">
                    Sanitized & Protected
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#18181B]">
                    <LinkIcon className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <input
                    id="input-social-url"
                    type="text"
                    required
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Paste TikTok/IG link (e.g. https://vt.tiktok.com/... or https://instagram.com/reel/...)"
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border-2 border-[#18181B] rounded-xl text-base sm:text-sm text-[#18181B] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5533] font-bold shadow-[2px_2px_0px_#18181B]"
                  />
                </div>

                {/* Real-time Link Validation & Sanitization Status */}
                {url.trim() ? (
                  <div className="mt-2">
                    {urlValidation.type === "tiktok" && (
                      <div className="flex items-center gap-1.5 text-xs text-[#065F46] font-extrabold bg-[#D1FAE5] border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] px-2.5 py-1 rounded-lg w-fit">
                        <Check className="w-3.5 h-3.5 stroke-[3] text-[#059669]" />
                        <span>Verified & Safe TikTok Links</span>
                      </div>
                    )}
                    {urlValidation.type === "instagram" && (
                      <div className="flex items-center gap-1.5 text-xs text-[#9D174D] font-extrabold bg-[#FCE7F3] border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] px-2.5 py-1 rounded-lg w-fit">
                        <Check className="w-3.5 h-3.5 stroke-[3] text-[#DB2777]" />
                        <span>Verified & Secure Instagram Links</span>
                      </div>
                    )}
                    {urlValidation.type === "unsupported" && (
                      <div className="flex items-center gap-1.5 text-xs text-[#854D0E] font-bold bg-[#FEF08A] border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] px-2.5 py-1 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
                        <span>Only official links from TikTok or Instagram are supported.</span>
                      </div>
                    )}
                    {urlValidation.type === "invalid" && (
                      <div className="flex items-center gap-1.5 text-xs text-[#991B1B] font-bold bg-[#FECDD3] border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] px-2.5 py-1 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 text-[#BE123C] shrink-0" />
                        <span>{urlValidation.feedbackMessage || "Invalid or disallowed link format."}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#52525B] mt-1.5 font-medium">
                    Automatically validates official TikTok or Instagram links to extract culinary spots, signature dishes, and Google Maps coordinates.
                  </p>
                )}
              </div>

              {/* Personal Notes (Optional) */}
              <div>
                <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider mb-1.5 font-mono-code">
                  Personal Taste Notes (Optional)
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3.5 text-[#18181B] pointer-events-none">
                    <FileText className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <textarea
                    id="input-personal-notes"
                    rows={2}
                    value={personalNotes}
                    onChange={(e) => setPersonalNotes(e.target.value)}
                    placeholder="Example: Must try the beef ribs, planning to visit with friends this weekend..."
                    maxLength={1000}
                    className="w-full pl-10 pr-3 py-2 bg-white border-2 border-[#18181B] rounded-xl text-base sm:text-xs text-[#18181B] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5533] font-bold shadow-[2px_2px_0px_#18181B]"
                  />
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-[#FECDD3] border-2 border-[#18181B] rounded-xl text-xs text-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                id="btn-submit-ai-extract"
                type="submit"
                disabled={loading || !url.trim() || !urlValidation.isValid}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-[#FF5533] hover:bg-[#ff4420] disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-black py-3 sm:py-3.5 px-4 rounded-xl text-xs sm:text-sm border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181B] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs sm:text-sm">Extracting spots with AI & matching on Google Maps...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 stroke-[2.5] text-yellow-300" />
                    <span>Extract & Save to Jurnal Rasa</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Results Review Mode */
            <div className="space-y-4 animate-fade-in">
              {fallbackNotice ? (
                <div className="bg-amber-500/[0.08] border border-amber-500/20 p-3 rounded-xl flex items-start gap-2.5 text-amber-950 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Jurnal Rasa Smart Parser Active</span>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      {fallbackNotice} Addresses and locations matched directly on Google Maps.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-emerald-500/[0.08] border border-emerald-500/20 p-3 rounded-xl flex items-center gap-2 text-emerald-950 text-xs font-bold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {isMultiPlace
                        ? `Successfully extracted ${extractedPlaces.length} culinary spots! You can adjust minor details or save all.`
                        : "Extraction and Google Maps verification complete! Review details before saving."}
                    </span>
                  </div>

                  {/* Reasoning Step Visual Clues */}
                  {reasoningStep?.visualCues && reasoningStep.visualCues.length > 0 && (
                    <div className="bg-orange-500/[0.06] border border-orange-500/20 rounded-xl p-2.5 text-xs text-stone-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-[#FF5C35]" />
                          <span className="font-bold text-[11px] text-stone-900">
                            Reasoning Step: {reasoningStep.visualCues.length} Visual Cues Grounded
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowReasoningDetails(!showReasoningDetails)}
                          className="text-[10px] font-bold text-[#FF5C35] hover:underline"
                        >
                          {showReasoningDetails ? "Hide reasoning" : "Show cues & reasoning"}
                        </button>
                      </div>
                      {showReasoningDetails && (
                        <div className="mt-2 pt-2 border-t border-orange-200/50 space-y-1.5 text-[11px]">
                          {reasoningStep.locationReasoning && (
                            <p className="text-stone-700 italic leading-relaxed">
                              "{reasoningStep.locationReasoning}"
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {reasoningStep.visualCues.map((cue, cIdx) => (
                              <span
                                key={cIdx}
                                className="bg-white/90 border border-orange-200/80 text-stone-700 text-[10px] px-2 py-0.5 rounded-md font-medium"
                              >
                                🔍 {cue}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Multi-place Carousel / Recap Mode */}
              {isMultiPlace && extractedPlaces.length > 1 ? (
                <div className="space-y-3">
                  {/* Multi-place header controls */}
                  <div className="flex items-center justify-between px-1 py-1">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A] hover:text-[#FF5C35] transition-colors"
                    >
                      {selectedPlaceIds.size === extractedPlaces.length ? (
                        <CheckSquare className="w-4 h-4 text-[#FF5C35]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#71716E]" />
                      )}
                      <span>
                        Select All ({selectedPlaceIds.size} of {extractedPlaces.length} Spots)
                      </span>
                    </button>
                    <span className="text-[11px] text-[#71716E]">
                      All spots checked by default
                    </span>
                  </div>

                  {/* List of extracted places */}
                  <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                    {extractedPlaces.map((place, idx) => {
                      const isSelected = selectedPlaceIds.has(place.placeId);
                      const isEditingThis = editingPlaceId === place.placeId;

                      return (
                        <div
                          key={place.placeId}
                          className={`p-3.5 rounded-2xl border transition-all ${isSelected
                            ? "bg-white border-[#FF5C35]/40 shadow-sm ring-1 ring-[#FF5C35]/20"
                            : "bg-black/[0.01] border-black/[0.06] opacity-60 hover:opacity-90"
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => togglePlaceSelection(place.placeId)}
                              className="pt-0.5 shrink-0 focus:outline-none"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#FF5C35]" />
                              ) : (
                                <Square className="w-4 h-4 text-[#71716E]" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0 space-y-1.5">
                              {isEditingThis ? (
                                <div className="space-y-2 text-xs pt-1">
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#71716E] mb-0.5">
                                      Spot Name:
                                    </label>
                                    <input
                                      type="text"
                                      value={place.name}
                                      onChange={(e) =>
                                        handleUpdatePlaceField(place.placeId, "name", e.target.value)
                                      }
                                      className="w-full p-2 bg-black/[0.02] border border-black/[0.1] rounded-lg text-xs font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#71716E] mb-0.5">
                                        City:
                                      </label>
                                      <input
                                        type="text"
                                        value={place.city}
                                        onChange={(e) =>
                                          handleUpdatePlaceField(place.placeId, "city", e.target.value)
                                        }
                                        className="w-full p-1.5 bg-black/[0.02] border border-black/[0.1] rounded-lg text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#71716E] mb-0.5">
                                        Estimated Price:
                                      </label>
                                      <input
                                        type="text"
                                        value={place.estimatedPrice}
                                        onChange={(e) =>
                                          handleUpdatePlaceField(place.placeId, "estimatedPrice", e.target.value)
                                        }
                                        className="w-full p-1.5 bg-black/[0.02] border border-black/[0.1] rounded-lg text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#71716E] mb-0.5">
                                      Google Maps Address:
                                    </label>
                                    <input
                                      type="text"
                                      value={place.address}
                                      onChange={(e) =>
                                        handleUpdatePlaceField(place.placeId, "address", e.target.value)
                                      }
                                      className="w-full p-1.5 bg-black/[0.02] border border-black/[0.1] rounded-lg text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPlaceId(null)}
                                    className="text-[11px] font-bold text-[#FF5C35] hover:underline pt-1"
                                  >
                                    Done Editing Minor Details
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FF5C35]/10 text-[#FF5C35]">
                                        Spot #{idx + 1}
                                      </span>
                                      <h4 className="text-sm font-extrabold text-[#1A1A1A] truncate">
                                        {place.name}
                                      </h4>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {place.rating && (
                                        <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                                          ⭐ {place.rating}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingPlaceId(place.placeId);
                                        }}
                                        className="p-1 text-[#71716E] hover:text-[#FF5C35] rounded-md transition-colors"
                                        title="Edit minor details"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <p className="text-xs text-[#71716E] flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-[#FF5C35] shrink-0" />
                                    <span className="font-bold text-[#1A1A1A]">{place.city}</span>
                                    <span className="truncate">• {place.address}</span>
                                  </p>

                                  {/* Visual Cue Grounding */}
                                  {place.visualCue && (
                                    <p className="text-[10px] text-amber-900 bg-amber-500/10 border border-amber-300/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-medium max-w-full">
                                      <Eye className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                                      <span className="font-bold text-amber-950 shrink-0">Visual cue:</span>
                                      <span className="truncate">{place.visualCue}</span>
                                    </p>
                                  )}

                                  {/* Dishes */}
                                  {place.recommendedDishes && place.recommendedDishes.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {place.recommendedDishes.map((d, dIdx) => (
                                        <span
                                          key={dIdx}
                                          className="text-[11px] bg-black/[0.04] text-[#1A1A1A] px-2 py-0.5 rounded-md font-medium"
                                        >
                                          {d}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Price & Tags & Google Maps Link */}
                                  <div className="flex items-center justify-between text-[11px] text-[#71716E] pt-1">
                                    <span className="font-semibold text-emerald-700">
                                      {place.estimatedPrice}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={getGoogleMapsUrl(place, "directions")}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title="View directions on registered Google Maps location"
                                        className="flex items-center gap-1 text-[10px] font-semibold text-[#FF5C35] hover:text-[#E84A23] bg-[#FF5C35]/10 px-2 py-0.5 rounded transition-colors"
                                      >
                                        <Navigation className="w-2.5 h-2.5" />
                                        <span>Maps Route</span>
                                      </a>
                                      <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                                        {place.tags[0] || "Culinary"}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Single Place Review Card */
                <div className="bg-white border border-black/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-4 space-y-3">
                  {extractedPlaces[0] && (
                    <>
                      <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                        <span className="text-[11px] font-bold text-[#71716E] uppercase tracking-wider">
                          Curated Culinary Details
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingSingle(!isEditingSingle)}
                          className="flex items-center gap-1 text-xs font-bold text-[#FF5C35] hover:text-[#E84A23] bg-[#FF5C35]/10 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{isEditingSingle ? "Done Editing" : "Edit Minor Details"}</span>
                        </button>
                      </div>

                      {isEditingSingle ? (
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-[#71716E] mb-1">
                              Place / Restaurant Name:
                            </label>
                            <input
                              type="text"
                              value={extractedPlaces[0].name}
                              onChange={(e) => {
                                const updated = [...extractedPlaces];
                                updated[0] = { ...updated[0], name: e.target.value };
                                setExtractedPlaces(updated);
                              }}
                              className="w-full p-2 bg-black/[0.02] border border-black/[0.08] rounded-xl text-xs font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-bold text-[#71716E] mb-1">
                                City / Area:
                              </label>
                              <input
                                type="text"
                                value={extractedPlaces[0].city}
                                onChange={(e) => {
                                  const updated = [...extractedPlaces];
                                  updated[0] = { ...updated[0], city: e.target.value };
                                  setExtractedPlaces(updated);
                                }}
                                className="w-full p-2 bg-black/[0.02] border border-black/[0.08] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#71716E] mb-1">
                                Estimated Price:
                              </label>
                              <input
                                type="text"
                                value={extractedPlaces[0].estimatedPrice}
                                onChange={(e) => {
                                  const updated = [...extractedPlaces];
                                  updated[0] = { ...updated[0], estimatedPrice: e.target.value };
                                  setExtractedPlaces(updated);
                                }}
                                className="w-full p-2 bg-black/[0.02] border border-black/[0.08] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#71716E] mb-1">
                              Full Address on Google Maps:
                            </label>
                            <input
                              type="text"
                              value={extractedPlaces[0].address}
                              onChange={(e) => {
                                const updated = [...extractedPlaces];
                                updated[0] = { ...updated[0], address: e.target.value };
                                setExtractedPlaces(updated);
                              }}
                              className="w-full p-2 bg-black/[0.02] border border-black/[0.08] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-extrabold text-[#1A1A1A] tracking-tight">
                                {extractedPlaces[0].name}
                              </h3>
                              <p className="text-xs text-[#71716E] flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-[#FF5C35]" />
                                <span className="font-bold text-[#1A1A1A]">{extractedPlaces[0].city}</span> •{" "}
                                {extractedPlaces[0].address}
                              </p>
                            </div>
                            {extractedPlaces[0].rating && (
                              <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-1 rounded-lg shrink-0">
                                ⭐ {extractedPlaces[0].rating}
                              </span>
                            )}
                          </div>

                          {/* Visual Cue Grounding */}
                          {extractedPlaces[0].visualCue && (
                            <p className="text-[11px] text-amber-900 bg-amber-500/10 border border-amber-300/40 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 font-medium">
                              <Eye className="w-3 h-3 text-amber-700 shrink-0" />
                              <span className="font-bold text-amber-950">Visual cue:</span>
                              <span>{extractedPlaces[0].visualCue}</span>
                            </p>
                          )}

                          {extractedPlaces[0].vibesOrSummary && (
                            <p className="text-xs italic text-[#71716E] bg-black/[0.02] p-2.5 rounded-xl border border-black/[0.06]">
                              "{extractedPlaces[0].vibesOrSummary}"
                            </p>
                          )}

                          {/* Recommended Dishes */}
                          <div>
                            <span className="text-[11px] font-bold text-[#71716E] uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                              <Utensils className="w-3.5 h-3.5 text-[#1A1A1A]" /> Recommended Dishes:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {extractedPlaces[0].recommendedDishes.map((dish, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-black/[0.04] text-[#1A1A1A] font-medium px-2.5 py-1 rounded-md border border-black/[0.04]"
                                >
                                  {dish}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-black/[0.06]">
                            <div className="flex items-center gap-1.5 text-xs text-[#1A1A1A]">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Price: <strong>{extractedPlaces[0].estimatedPrice}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#1A1A1A]">
                              <Tag className="w-3.5 h-3.5 text-[#FF5C35]" />
                              <span className="truncate">Tags: {extractedPlaces[0].tags.join(", ")}</span>
                            </div>
                          </div>

                          <div className="pt-1">
                            <a
                              href={getGoogleMapsUrl(extractedPlaces[0], "directions")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF5C35] hover:text-[#E84A23] bg-[#FF5C35]/10 hover:bg-[#FF5C35]/20 px-3 py-1.5 rounded-xl transition-colors"
                              title="Open registered Google Maps location and route directions"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>View Route on Google Maps (Registered Place)</span>
                            </a>
                          </div>
                        </>
                      )}

                      {/* Personal Notes */}
                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-[#71716E] uppercase tracking-wider mb-1">
                          My Personal Note:
                        </label>
                        <textarea
                          rows={2}
                          value={personalNotes}
                          onChange={(e) => setPersonalNotes(e.target.value)}
                          placeholder="Example: Planning to visit with coworkers this weekend..."
                          className="w-full p-2.5 bg-black/[0.02] border border-black/[0.08] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF5C35]"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Source link info */}
              {url && (
                <div className="text-[11px] text-[#71716E] flex items-center gap-1 truncate px-1">
                  <ExternalLink className="w-3 h-3 text-[#71716E] shrink-0" />
                  <span className="truncate">Source: {url}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExtractedPlaces([])}
                  className="w-full sm:flex-1 min-h-[44px] py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-[#18181B] bg-white hover:bg-stone-100 border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer"
                >
                  ← Back to Link Input
                </button>
                <button
                  id="btn-confirm-save"
                  type="button"
                  disabled={saving || (isMultiPlace && selectedPlaceIds.size === 0)}
                  onClick={handleCommitSave}
                  className="w-full sm:flex-1 min-h-[44px] flex items-center justify-center gap-2 bg-[#FF5533] hover:bg-[#ff4420] disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-black py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to Journal...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        {isMultiPlace && extractedPlaces.length > 1
                          ? `Save All ${selectedPlaceIds.size} Spots to Journal`
                          : "Save to Taste Journal"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

