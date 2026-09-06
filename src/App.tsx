import React, { useState, useEffect, useMemo } from "react";
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  increment,
  serverTimestamp,
  cleanupGuestSession,
  type User,
} from "./lib/firebase";
import {
  UserSavedPlace,
  PublicPlace,
  UserProfile,
  CulinaryParseResult,
  MapMode,
  AppTab,
  FilterState,
} from "./types";
import {
  INITIAL_PUBLIC_PLACES,
  INITIAL_USER_SAVED_PLACES,
  CITIES,
  POPULAR_TAGS,
} from "./lib/demoData";
import { Navbar } from "./components/Navbar";
import { FoodMap } from "./components/FoodMap";
import { PlaceCard } from "./components/PlaceCard";
import { CuratorModal } from "./components/CuratorModal";
import { StatsBar } from "./components/StatsBar";
import { JournalView } from "./components/JournalView";
import { CopilotChat } from "./components/CopilotChat";
import { QuickManualModal } from "./components/QuickManualModal";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { LandingPage } from "./components/LandingPage";
import {
  Search,
  SlidersHorizontal,
  Flame,
  BookmarkCheck,
  Sparkles,
  MapPin,
  Utensils,
  Info,
  CheckCircle2,
  X,
  LogIn,
  Layers,
  HelpCircle,
} from "lucide-react";

export default function App() {
  // State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>("journal");
  const [mode, setMode] = useState<MapMode>("my_radar");

  const [myPlaces, setMyPlaces] = useState<UserSavedPlace[]>(INITIAL_USER_SAVED_PLACES);
  const [publicPlaces, setPublicPlaces] = useState<PublicPlace[]>(INITIAL_PUBLIC_PLACES);

  const [selectedPlace, setSelectedPlace] = useState<PublicPlace | UserSavedPlace | null>(null);
  const [isCuratorOpen, setIsCuratorOpen] = useState(false);
  const [isQuickManualOpen, setIsQuickManualOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [selectedTag, setSelectedTag] = useState("All Categories");
  const [sortBy, setSortBy] = useState<"latest" | "most_saved" | "rating">("most_saved");

  // Show toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName:
            firebaseUser.displayName ||
            (firebaseUser.isAnonymous ? "Guest Explorer" : "Food Explorer"),
          photoURL: firebaseUser.photoURL,
          isAnonymous: firebaseUser.isAnonymous,
        });
        try {
          localStorage.removeItem("jr_is_guest");
        } catch {}
      } else {
        // Check if user is active in a local guest session
        let isGuest = false;
        try {
          isGuest = localStorage.getItem("jr_is_guest") === "true";
        } catch {}

        if (isGuest) {
          const guestId =
            localStorage.getItem("jr_guest_uid") ||
            ("guest_" + Date.now().toString(36));
          setUser({
            uid: guestId,
            email: null,
            displayName: "Guest Explorer",
            photoURL: null,
            isAnonymous: true,
          });
        } else {
          setUser(null);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Firestore Public Places live listener
  useEffect(() => {
    try {
      const publicCol = collection(db, "public_places");
      const unsubscribe = onSnapshot(
        publicCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const places: PublicPlace[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as PublicPlace;
              let sourceUrl = data.sourceUrl || "";
              if (!sourceUrl) {
                const match = INITIAL_PUBLIC_PLACES.find(
                  (p) => p.placeId === docSnap.id || p.name.toLowerCase() === data.name?.toLowerCase()
                );
                sourceUrl = match?.sourceUrl || `https://www.tiktok.com/search?q=${encodeURIComponent(`${data.name || ""} ${data.city || ""}`)}`;
              }
              places.push({ ...(data as PublicPlace), placeId: docSnap.id, sourceUrl });
            });
            setPublicPlaces(places);
          } else {
            // Seed initial public places into Firestore with verified TikTok links
            INITIAL_PUBLIC_PLACES.forEach(async (place) => {
              try {
                await setDoc(doc(db, "public_places", place.placeId), {
                  ...place,
                  lastUpdated: new Date().toISOString(),
                });
              } catch {
                // ignore
              }
            });
            setPublicPlaces(INITIAL_PUBLIC_PLACES);
          }
        },
        (error) => {
          console.warn("Firestore public places listener error, using local fallback:", error);
          setPublicPlaces(INITIAL_PUBLIC_PLACES);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn("Firestore init warning:", err);
      setPublicPlaces(INITIAL_PUBLIC_PLACES);
    }
  }, []);

  // 3. Firestore User Private Places live listener (strictly isolated per userId)
  useEffect(() => {
    if (!user || !user.uid) return;

    try {
      const userPlacesCol = collection(db, "users", user.uid, "saved_places");
      const unsubscribe = onSnapshot(
        userPlacesCol,
        (snapshot) => {
          const deletedKey = `rr_deleted_ids_${user.uid}`;
          let deletedIds = new Set<string>();
          try {
            deletedIds = new Set(JSON.parse(localStorage.getItem(deletedKey) || "[]"));
          } catch {}

          if (!snapshot.empty) {
            const places: UserSavedPlace[] = [];
            snapshot.forEach((docSnap) => {
              if (!deletedIds.has(docSnap.id)) {
                places.push({ ...(docSnap.data() as UserSavedPlace), placeId: docSnap.id });
              }
            });
            setMyPlaces(places);
            try {
              localStorage.setItem(`rr_user_saved_${user.uid}`, JSON.stringify(places));
            } catch {}
          } else {
            // Check local storage for this user if firestore subcollection empty
            const localSaved = localStorage.getItem(`rr_user_saved_${user.uid}`);
            if (localSaved) {
              try {
                const parsed: UserSavedPlace[] = JSON.parse(localSaved);
                setMyPlaces(parsed.filter((p) => !deletedIds.has(p.placeId)));
              } catch {
                setMyPlaces(INITIAL_USER_SAVED_PLACES.filter((p) => !deletedIds.has(p.placeId)));
              }
            } else {
              setMyPlaces(INITIAL_USER_SAVED_PLACES.filter((p) => !deletedIds.has(p.placeId)));
            }
          }
        },
        (error) => {
          console.warn("Firestore user places listener error:", error);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn("Error setting up user places listener:", err);
    }
  }, [user]);

  // Auth actions
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthModalOpen(false);
      showToast("Successfully signed in with Google!");
    } catch (err: any) {
      if (
        err?.code === "auth/unauthorized-domain" ||
        err?.message?.includes("unauthorized-domain")
      ) {
        console.warn(
          "Firebase Auth: Current domain is not registered in Firebase Console Authorized Domains."
        );
        const domain = typeof window !== "undefined" ? window.location.hostname : "";
        showToast(
          `Domain (${domain}) is not authorized in Firebase Auth. Please use Guest Mode!`
        );
      } else if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request"
      ) {
        // User closed popup; do not log fatal error
      } else {
        console.error("Google sign in error:", err);
        showToast("Failed to sign in with Google: " + (err.message || ""));
      }
      throw err;
    }
  };

  const handleGuestSignIn = async () => {
    try {
      const guestId =
        localStorage.getItem("jr_guest_uid") ||
        ("guest_" + Date.now().toString(36));
      localStorage.setItem("jr_guest_uid", guestId);
      localStorage.setItem("jr_is_guest", "true");
      setUser({
        uid: guestId,
        email: null,
        displayName: "Guest Explorer",
        photoURL: null,
        isAnonymous: true,
      });
      showToast("Guest Mode active! All features ready to explore.");
    } catch {
      setUser({
        uid: "guest_" + Date.now().toString(36),
        email: null,
        displayName: "Guest Explorer",
        photoURL: null,
        isAnonymous: true,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      if (user?.isAnonymous) {
        // Clean up guest local data
        try {
          localStorage.removeItem("jr_is_guest");
          localStorage.removeItem("jr_guest_uid");
          localStorage.removeItem(`jr_active_conv_${user.uid}`);
          localStorage.removeItem(`rr_user_saved_${user.uid}`);
          localStorage.removeItem(`rr_deleted_ids_${user.uid}`);
        } catch {}
        if (auth.currentUser) {
          await cleanupGuestSession(user.uid);
        }
        showToast("Guest session ended and temporary notes cleared.");
      } else {
        showToast("Successfully signed out of Google account.");
      }
      await signOut(auth);
      setUser(null);
    } catch (err: any) {
      console.warn("Sign out notice:", err);
      try {
        await signOut(auth);
      } catch {}
      setUser(null);
    }
  };

  // Set of place IDs currently saved by user
  const userSavedPlaceIds = useMemo(() => {
    return new Set(myPlaces.map((p) => p.placeId));
  }, [myPlaces]);

  // Helper to ensure Firestore calls never hang indefinitely
  const runWithTimeout = async <T,>(promise: Promise<T>, timeoutMs = 3500): Promise<T | null> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => resolve(null), timeoutMs);
    });
    try {
      const res = await Promise.race([promise, timeoutPromise]);
      return res as T | null;
    } catch (e) {
      console.warn("Firestore safe operation warning:", e);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Save parsed culinary item (Dual write: Private User Subcollection + Public Atomic Increment)
  const handleSaveCulinaryPlace = async (
    parsed: CulinaryParseResult,
    personalNotes: string
  ) => {
    const currentUserId = user?.uid || "guest_user";

    const userPlaceData: UserSavedPlace = {
      placeId: parsed.placeId,
      name: parsed.name,
      address: parsed.address,
      city: parsed.city,
      lat: parsed.lat,
      lng: parsed.lng,
      rating: parsed.rating || 4.5,
      sourceUrl: parsed.sourceUrl || "",
      recommendedDishes: parsed.recommendedDishes,
      estimatedPrice: parsed.estimatedPrice,
      tags: parsed.tags,
      personalNotes: personalNotes,
      savedAt: new Date().toISOString(),
      vibesOrSummary: parsed.vibesOrSummary,
    };

    // Un-delete if it was previously deleted
    try {
      const deletedKey = `rr_deleted_ids_${currentUserId}`;
      const existingDeleted: string[] = JSON.parse(localStorage.getItem(deletedKey) || "[]");
      const updatedDeleted = existingDeleted.filter((id) => id !== parsed.placeId);
      localStorage.setItem(deletedKey, JSON.stringify(updatedDeleted));
    } catch {}

    // Optimistically update local state immediately for 0-latency instant feedback
    setMyPlaces((prev) => {
      const updated = [userPlaceData, ...prev.filter((p) => p.placeId !== parsed.placeId)];
      try {
        localStorage.setItem(`rr_user_saved_${currentUserId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setPublicPlaces((prev) => {
      const existing = prev.find((p) => p.placeId === parsed.placeId);
      if (existing) {
        return prev.map((p) =>
          p.placeId === parsed.placeId ? { ...p, saveCount: p.saveCount + 1 } : p
        );
      } else {
        return [
          {
            placeId: parsed.placeId,
            name: parsed.name,
            address: parsed.address,
            city: parsed.city,
            lat: parsed.lat,
            lng: parsed.lng,
            rating: parsed.rating || 4.5,
            saveCount: 1,
            topDishes: parsed.recommendedDishes,
            tags: parsed.tags,
            lastUpdated: new Date().toISOString(),
            vibesOrSummary: parsed.vibesOrSummary,
            sourceUrl: parsed.sourceUrl || "",
          },
          ...prev,
        ];
      }
    });

    setSelectedPlace(userPlaceData);
    showToast(`"${parsed.name}" successfully added to your Radar & Community Map!`);

    // Dual-write to Firestore with safety timeout (prevents infinite hanging)
    await Promise.allSettled([
      runWithTimeout(
        setDoc(doc(db, "users", currentUserId, "saved_places", parsed.placeId), {
          ...userPlaceData,
          savedAt: serverTimestamp(),
        })
      ),
      runWithTimeout(
        setDoc(
          doc(db, "public_places", parsed.placeId),
          {
            placeId: parsed.placeId,
            name: parsed.name,
            address: parsed.address,
            city: parsed.city,
            lat: parsed.lat,
            lng: parsed.lng,
            rating: parsed.rating || 4.5,
            saveCount: increment(1),
            topDishes: parsed.recommendedDishes,
            tags: parsed.tags,
            vibesOrSummary: parsed.vibesOrSummary,
            sourceUrl: parsed.sourceUrl || "",
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        )
      ),
    ]);
  };

  // Batch save multiple culinary spots (e.g. from photo carousel slides or video recaps)
  const handleSaveMultipleCulinaryPlaces = async (
    items: Array<{ parsed: CulinaryParseResult; personalNotes: string }>
  ) => {
    if (!items || items.length === 0) return;
    const currentUserId = user?.uid || "guest_user";

    const newSavedPlaces: UserSavedPlace[] = [];
    const deletedKey = `rr_deleted_ids_${currentUserId}`;
    let existingDeleted: string[] = [];
    try {
      existingDeleted = JSON.parse(localStorage.getItem(deletedKey) || "[]");
    } catch {}

    for (const item of items) {
      const { parsed, personalNotes } = item;
      const userPlaceData: UserSavedPlace = {
        placeId: parsed.placeId,
        name: parsed.name,
        address: parsed.address,
        city: parsed.city,
        lat: parsed.lat,
        lng: parsed.lng,
        rating: parsed.rating || 4.5,
        sourceUrl: parsed.sourceUrl,
        recommendedDishes: parsed.recommendedDishes,
        estimatedPrice: parsed.estimatedPrice,
        tags: parsed.tags,
        personalNotes: personalNotes,
        savedAt: new Date().toISOString(),
        vibesOrSummary: parsed.vibesOrSummary,
      };
      newSavedPlaces.push(userPlaceData);
      existingDeleted = existingDeleted.filter((id) => id !== parsed.placeId);
    }

    try {
      localStorage.setItem(deletedKey, JSON.stringify(existingDeleted));
    } catch {}

    // Optimistically update local private radar
    setMyPlaces((prev) => {
      const newIds = new Set(newSavedPlaces.map((p) => p.placeId));
      const filteredPrev = prev.filter((p) => !newIds.has(p.placeId));
      const combined = [...newSavedPlaces, ...filteredPrev];
      try {
        localStorage.setItem(`rr_user_saved_${currentUserId}`, JSON.stringify(combined));
      } catch {}
      return combined;
    });

    // Optimistically update community public places
    setPublicPlaces((prev) => {
      const updated = [...prev];
      for (const item of items) {
        const idx = updated.findIndex((p) => p.placeId === item.parsed.placeId);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], saveCount: updated[idx].saveCount + 1 };
        } else {
          updated.unshift({
            placeId: item.parsed.placeId,
            name: item.parsed.name,
            address: item.parsed.address,
            city: item.parsed.city,
            lat: item.parsed.lat,
            lng: item.parsed.lng,
            rating: item.parsed.rating || 4.5,
            saveCount: 1,
            topDishes: item.parsed.recommendedDishes,
            tags: item.parsed.tags,
            lastUpdated: new Date().toISOString(),
            vibesOrSummary: item.parsed.vibesOrSummary,
            sourceUrl: item.parsed.sourceUrl || "",
          });
        }
      }
      return updated;
    });

    if (newSavedPlaces.length > 0) {
      setSelectedPlace(newSavedPlaces[0]);
    }
    showToast(`${items.length} culinary spots successfully added to your Radar & Map!`);

    // Dual-write to Firestore with safety timeout
    const firestorePromises = items.flatMap((item) => [
      runWithTimeout(
        setDoc(doc(db, "users", currentUserId, "saved_places", item.parsed.placeId), {
          ...item.parsed,
          personalNotes: item.personalNotes,
          savedAt: serverTimestamp(),
        })
      ),
      runWithTimeout(
        setDoc(
          doc(db, "public_places", item.parsed.placeId),
          {
            placeId: item.parsed.placeId,
            name: item.parsed.name,
            address: item.parsed.address,
            city: item.parsed.city,
            lat: item.parsed.lat,
            lng: item.parsed.lng,
            rating: item.parsed.rating || 4.5,
            saveCount: increment(1),
            topDishes: item.parsed.recommendedDishes,
            tags: item.parsed.tags,
            vibesOrSummary: item.parsed.vibesOrSummary,
            sourceUrl: item.parsed.sourceUrl || "",
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        )
      ),
    ]);

    await Promise.allSettled(firestorePromises);
  };

  // Quick save from community pulse to private radar
  const handleSaveCommunityToMyRadar = async (publicPlace: PublicPlace) => {
    if (userSavedPlaceIds.has(publicPlace.placeId)) {
      showToast("This place is already in your Radar!");
      return;
    }

    const currentUserId = user?.uid || "guest_user";
    const userPlaceData: UserSavedPlace = {
      placeId: publicPlace.placeId,
      name: publicPlace.name,
      address: publicPlace.address,
      city: publicPlace.city,
      lat: publicPlace.lat,
      lng: publicPlace.lng,
      rating: publicPlace.rating || 4.5,
      recommendedDishes: publicPlace.topDishes,
      tags: publicPlace.tags,
      personalNotes: "Saved from trending community recommendations",
      savedAt: new Date().toISOString(),
      vibesOrSummary: publicPlace.vibesOrSummary,
    };

    // Instant optimistic update
    setMyPlaces((prev) => [userPlaceData, ...prev]);
    setPublicPlaces((prev) =>
      prev.map((p) =>
        p.placeId === publicPlace.placeId ? { ...p, saveCount: p.saveCount + 1 } : p
      )
    );
    showToast(`"${publicPlace.name}" successfully saved to My Radar!`);

    await Promise.allSettled([
      runWithTimeout(
        setDoc(doc(db, "users", currentUserId, "saved_places", publicPlace.placeId), {
          ...userPlaceData,
          savedAt: serverTimestamp(),
        })
      ),
      runWithTimeout(
        setDoc(
          doc(db, "public_places", publicPlace.placeId),
          { saveCount: increment(1) },
          { merge: true }
        )
      ),
    ]);
  };

  // Save an AI-recommended spot to user's personal taste journal
  const handleSavePlaceFromAI = async (recommended: {
    name: string;
    city: string;
    address?: string;
    signatureDish: string;
    matchReason?: string;
    tags?: string[];
  }) => {
    const currentUserId = user?.uid || "guest_user";

    // Duplicate check
    const existing = myPlaces.find(
      (p) => p.name.toLowerCase().trim() === recommended.name.toLowerCase().trim()
    );
    if (existing) {
      showToast(`"${recommended.name}" is already in your Taste Journal!`);
      return;
    }

    const placeId = `ai_rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    // Approximate city coordinates fallback for mapping
    const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
      jakarta: { lat: -6.2088, lng: 106.8456 },
      bandung: { lat: -6.9175, lng: 107.6191 },
      surabaya: { lat: -7.2575, lng: 112.7521 },
      yogyakarta: { lat: -7.7956, lng: 110.3695 },
      jogja: { lat: -7.7956, lng: 110.3695 },
      bali: { lat: -8.65, lng: 115.2167 },
      semarang: { lat: -6.9667, lng: 110.4167 },
      solo: { lat: -7.5667, lng: 110.8167 },
      surakarta: { lat: -7.5667, lng: 110.8167 },
      medan: { lat: 3.5952, lng: 98.6722 },
      makassar: { lat: -5.1477, lng: 119.4327 },
      malang: { lat: -7.9797, lng: 112.6304 },
    };

    const normCity = (recommended.city || "").toLowerCase();
    let matchedCoords = { lat: -6.2088, lng: 106.8456 }; // Jakarta default
    for (const [key, coords] of Object.entries(CITY_COORDS)) {
      if (normCity.includes(key)) {
        matchedCoords = coords;
        break;
      }
    }

    const newPlace: UserSavedPlace = {
      placeId,
      name: recommended.name,
      address: recommended.address || `${recommended.name}, ${recommended.city || "Indonesia"}`,
      city: recommended.city || "Indonesia",
      lat: matchedCoords.lat,
      lng: matchedCoords.lng,
      rating: 4.8,
      recommendedDishes: recommended.signatureDish ? [recommended.signatureDish] : ["Signature Menu"],
      tags: recommended.tags?.length ? recommended.tags : ["Taste Finder AI", "Wishlist"],
      personalNotes: recommended.matchReason
        ? `Taste Finder AI: ${recommended.matchReason}`
        : "Discovered via Taste Finder AI exploration",
      savedAt: new Date().toISOString(),
      vibesOrSummary: recommended.signatureDish
        ? `Must try: ${recommended.signatureDish}`
        : "Curated by Taste Finder AI",
      visited: false,
    };

    // Instant optimistic update
    setMyPlaces((prev) => {
      const updated = [newPlace, ...prev];
      try {
        localStorage.setItem(`rr_user_saved_${currentUserId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    showToast(`"${recommended.name}" added to your Taste Journal!`);

    await runWithTimeout(
      setDoc(doc(db, "users", currentUserId, "saved_places", placeId), {
        ...newPlace,
        savedAt: serverTimestamp(),
      })
    );
  };

  // Remove place from private radar
  const handleDeleteFromMyRadar = async (placeId: string) => {
    const currentUserId = user?.uid || "guest_user";

    // Remember this ID was explicitly deleted by user so it never re-appears
    try {
      const deletedKey = `rr_deleted_ids_${currentUserId}`;
      const existingDeleted: string[] = JSON.parse(localStorage.getItem(deletedKey) || "[]");
      if (!existingDeleted.includes(placeId)) {
        existingDeleted.push(placeId);
        localStorage.setItem(deletedKey, JSON.stringify(existingDeleted));
      }
    } catch {}

    setMyPlaces((prev) => {
      const updated = prev.filter((p) => p.placeId !== placeId);
      try {
        localStorage.setItem(`rr_user_saved_${currentUserId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (selectedPlace?.placeId === placeId) {
      setSelectedPlace(null);
    }
    showToast("Place removed from your Radar.");

    await runWithTimeout(deleteDoc(doc(db, "users", currentUserId, "saved_places", placeId)));
  };

  // Toggle visited status for a journal place
  const handleToggleVisited = async (placeId: string, currentVisited: boolean) => {
    const currentUserId = user?.uid || "guest_user";
    const newStatus = !currentVisited;
    const visitedAt = newStatus ? new Date().toISOString() : undefined;

    setMyPlaces((prev) => {
      const updated = prev.map((p) =>
        p.placeId === placeId ? { ...p, visited: newStatus, visitedAt } : p
      );
      try {
        localStorage.setItem(`rr_user_saved_${currentUserId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    showToast(
      newStatus
        ? "Marked as Visited! 🎉"
        : "Moved back to Wishlist."
    );

    await runWithTimeout(
      setDoc(
        doc(db, "users", currentUserId, "saved_places", placeId),
        { visited: newStatus, visitedAt: newStatus ? serverTimestamp() : null },
        { merge: true }
      )
    );
  };

  // Save manual taste log into personal journal
  const handleSaveManualPlace = async (newPlace: UserSavedPlace) => {
    const currentUserId = user?.uid || "guest_user";

    setMyPlaces((prev) => {
      const updated = [newPlace, ...prev.filter((p) => p.placeId !== newPlace.placeId)];
      try {
        localStorage.setItem(`rr_user_saved_${currentUserId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    showToast(`"${newPlace.name}" successfully added to your Taste Journal!`);

    await runWithTimeout(
      setDoc(doc(db, "users", currentUserId, "saved_places", newPlace.placeId), {
        ...newPlace,
        savedAt: serverTimestamp(),
      })
    );
  };

  // Filtered and Sorted Places
  const activePlaces = useMemo(() => {
    const list = mode === "my_radar" ? myPlaces : publicPlaces;

    return list.filter((p) => {
      // City filter
      if (selectedCity !== "All Cities" && !p.city.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false;
      }
      // Tag filter
      if (selectedTag !== "All Categories" && !(p.tags || []).some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const dishes = "recommendedDishes" in p ? p.recommendedDishes : p.topDishes || [];
        const notes = "personalNotes" in p ? (p.personalNotes || "") : "";
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCity = p.city.toLowerCase().includes(q);
        const matchesDishes = dishes.some((d) => d.toLowerCase().includes(q));
        const matchesNotes = notes.toLowerCase().includes(q);
        const matchesTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesCity && !matchesDishes && !matchesNotes && !matchesTags) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "most_saved") {
        const countA = "saveCount" in a ? a.saveCount : 1;
        const countB = "saveCount" in b ? b.saveCount : 1;
        return countB - countA;
      }
      if (sortBy === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      }
      return 0;
    });
  }, [mode, myPlaces, publicPlaces, selectedCity, selectedTag, searchQuery, sortBy]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDF7] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-14 h-14 rounded-2xl bg-[#FF5533] border-[3px] border-[#18181B] shadow-[4px_4px_0px_#18181B] flex items-center justify-center text-white mb-4 animate-bounce">
          <Sparkles className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h2 className="text-xl font-black font-display text-[#18181B]">Jurnal Rasa</h2>
        <p className="text-xs text-[#71716E] font-mono-code font-bold mt-1">
          Preparing your culinary notebook...
        </p>
      </div>
    );
  }

  // If user is not authenticated, render production-ready Landing Page
  if (!user) {
    return (
      <LandingPage
        onGoogleSignIn={handleGoogleSignIn}
        onGuestSignIn={handleGuestSignIn}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EB] flex flex-col font-sans text-[#18181B]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#18181B] text-[#FFFDF7] text-xs font-black px-4 py-3 rounded-xl shadow-[4px_4px_0px_#000] flex items-center gap-2.5 animate-slide-down border-2 border-[#FEF08A] font-mono-code">
          <CheckCircle2 className="w-4 h-4 text-[#BBF7D0] stroke-[2.5] shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-stone-300 hover:text-white">
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "community") setMode("community_pulse");
          else setMode("my_radar");
          setSelectedPlace(null);
        }}
        onOpenCurator={() => setIsCuratorOpen(true)}
        onOpenQuickManual={() => setIsQuickManualOpen(true)}
        user={user}
        onSignIn={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        mySavesCount={myPlaces.length}
        communityCount={publicPlaces.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5 pb-24 md:pb-8">
        {/* VIEW 1: JURNAL RASA (MERGED: TASTE NOTES + FINDER AI COPILOT) */}
        {(activeTab === "journal" || activeTab === "copilot") && (
          <JournalView
            places={myPlaces}
            initialSubTab={activeTab === "copilot" ? "chat" : "places"}
            onOpenCurator={() => setIsCuratorOpen(true)}
            onOpenQuickManual={() => setIsQuickManualOpen(true)}
            onToggleVisited={handleToggleVisited}
            onDeletePlace={handleDeleteFromMyRadar}
            onSelectOnMap={(place) => {
              setSelectedPlace(place);
              setActiveTab("map");
              setMode("my_radar");
            }}
            onNavigateToMap={() => {
              setActiveTab("map");
              setMode("my_radar");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onNavigateToCommunity={() => {
              setActiveTab("community");
              setMode("community_pulse");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            communityCount={publicPlaces.length}
            selectedCity={selectedCity}
            onChangeCity={setSelectedCity}
            selectedTag={selectedTag}
            onChangeTag={setSelectedTag}
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            availableCities={CITIES}
            availableTags={POPULAR_TAGS}
            onSavePlace={handleSavePlaceFromAI}
          />
        )}

        {/* VIEW 3: MAP VIEW */}
        {activeTab === "map" && (
          <div className="space-y-4">
            <div className="bg-[#FFFDF7] rounded-2xl p-4 border-2 border-[#18181B] shadow-[3.5px_3.5px_0px_#18181B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black font-display text-[#18181B] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#FF5533] stroke-[2.5]" />
                  <span>Taste Journal Map (Peta Rasa)</span>
                </h2>
                <p className="text-xs text-[#52525B] font-medium font-handwriting">
                  Displaying {myPlaces.length} culinary spots pinned in your personal taste journal
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsQuickManualOpen(true)}
                  className="bg-white hover:bg-[#FEF08A] text-[#18181B] text-xs font-black px-3 py-2 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer"
                >
                  + Quick Note
                </button>
                <button
                  onClick={() => setIsCuratorOpen(true)}
                  className="bg-[#FF5533] hover:bg-[#ff4420] text-white text-xs font-black px-3.5 py-2 rounded-xl border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
                  title="Quick save food spots from TikTok or Instagram links"
                >
                  <span>+ Quick Save</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 xl:col-span-8 h-[440px] lg:h-[calc(100vh-240px)] rounded-2xl sm:rounded-3xl overflow-hidden">
                <FoodMap
                  mode="my_radar"
                  places={myPlaces}
                  selectedPlace={selectedPlace}
                  onSelectPlace={(p) => setSelectedPlace(p)}
                  onClose={() => setSelectedPlace(null)}
                  onSaveToMyRadar={handleSaveCommunityToMyRadar}
                  onDelete={handleDeleteFromMyRadar}
                  userSavedPlaceIds={userSavedPlaceIds}
                />
              </div>

              <div className="lg:col-span-5 xl:col-span-4 space-y-3.5 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
                {myPlaces.map((place) => (
                  <PlaceCard
                    key={place.placeId}
                    place={place}
                    mode="my_radar"
                    isSelected={selectedPlace?.placeId === place.placeId}
                    onSelect={() => setSelectedPlace(place)}
                    onDelete={handleDeleteFromMyRadar}
                    onSaveToMyRadar={handleSaveCommunityToMyRadar}
                    isSavedInMyRadar={true}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: COMMUNITY PULSE (SUPPLEMENTARY DISCOVERY) */}
        {activeTab === "community" && (
          <div className="space-y-5">
            <StatsBar myPlaces={myPlaces} publicPlaces={publicPlaces} mode="community_pulse" />

            {/* Filter and Search Bar */}
            <div className="bg-[#FFFDF7] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border-2 border-[#18181B] shadow-[4px_4px_0px_#18181B] flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#18181B]">
                  <Search className="w-4 h-4 stroke-[2.5]" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search trending spots, dishes, or cities..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-[#18181B] rounded-xl text-xs sm:text-sm text-[#18181B] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5533] font-bold shadow-[2px_2px_0px_#18181B]"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] text-[#18181B] text-xs font-black py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5533]"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      📍 {c}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] text-[#18181B] text-xs font-black py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5533]"
                >
                  {POPULAR_TAGS.map((t) => (
                    <option key={t} value={t}>
                      🏷️ {t}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] text-[#18181B] text-xs font-black py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5533]"
                >
                  <option value="most_saved">🔥 Most Saved</option>
                  <option value="rating">⭐ Highest Rated</option>
                  <option value="latest">🕒 Newest</option>
                </select>

                <button
                  onClick={() => setIsInfoModalOpen(true)}
                  title="Jurnal Rasa Architecture Information"
                  className="p-2 text-[#18181B] hover:bg-[#FEF08A] bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 shrink-0"
                >
                  <Info className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-6 xl:col-span-7 h-[440px] lg:h-[calc(100vh-220px)] lg:sticky lg:top-24">
                <FoodMap
                  mode="community_pulse"
                  places={activePlaces}
                  selectedPlace={selectedPlace}
                  onSelectPlace={(p) => setSelectedPlace(p)}
                  onClose={() => setSelectedPlace(null)}
                  onSaveToMyRadar={handleSaveCommunityToMyRadar}
                  onDelete={handleDeleteFromMyRadar}
                  userSavedPlaceIds={userSavedPlaceIds}
                />
              </div>

              <div className="lg:col-span-6 xl:col-span-5 space-y-3.5">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-[#18181B] flex items-center gap-1.5 font-mono-code">
                      <Flame className="w-4 h-4 text-[#FF5533] stroke-[3]" />
                      <span>Trending Community Spots ({activePlaces.length})</span>
                    </h2>
                    <p className="text-xs text-[#52525B] mt-0.5 font-handwriting">
                      Culinary gems most frequently saved by fellow foodies
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {activePlaces.map((place) => (
                    <PlaceCard
                      key={place.placeId}
                      place={place}
                      mode="community_pulse"
                      isSelected={selectedPlace?.placeId === place.placeId}
                      onSelect={() => setSelectedPlace(place)}
                      onDelete={handleDeleteFromMyRadar}
                      onSaveToMyRadar={handleSaveCommunityToMyRadar}
                      isSavedInMyRadar={userSavedPlaceIds.has(place.placeId)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile-first Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === "community") setMode("community_pulse");
          else setMode("my_radar");
          setSelectedPlace(null);
        }}
        journalCount={myPlaces.length}
        communityCount={publicPlaces.length}
      />

      {/* Quick Manual Taste Journal Modal */}
      <QuickManualModal
        isOpen={isQuickManualOpen}
        onClose={() => setIsQuickManualOpen(false)}
        onSave={handleSaveManualPlace}
      />

      {/* Curator AI Modal */}
      <CuratorModal
        isOpen={isCuratorOpen}
        onClose={() => setIsCuratorOpen(false)}
        onSaveSuccess={handleSaveCulinaryPlace}
        onSaveMultiple={handleSaveMultipleCulinaryPlaces}
      />

      {/* Google Sign-in / Account Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FFFDF7] rounded-2xl sm:rounded-3xl shadow-[7px_7px_0px_#18181B] border-[3px] border-[#18181B] w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b-2 border-[#18181B] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-center font-black">
                  <LogIn className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black font-display text-[#18181B]">Sign In to Jurnal Rasa</h3>
                  <p className="text-xs text-[#52525B] font-medium">Sync your personal taste journal across devices</p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 text-[#18181B] hover:bg-[#FEF08A] rounded-lg border-2 border-transparent hover:border-[#18181B] transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <p className="text-xs text-[#52525B] font-medium leading-relaxed">
              Sign in with your Google account to automatically back up your saved culinary gems from TikTok and Instagram, sync your taste journal across devices, and keep your personal foodie notes safe and private.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-[#FEF08A] text-[#18181B] font-black py-2.5 px-4 rounded-xl border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] text-xs transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                onClick={() => {
                  setIsAuthModalOpen(false);
                  showToast("You are browsing in automatic guest mode.");
                }}
                className="w-full py-2.5 px-4 text-xs font-black text-[#18181B] hover:bg-stone-200 bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info & Hackathon Architecture Modal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FFFDF7] rounded-2xl sm:rounded-3xl shadow-[8px_8px_0px_#18181B] border-[3px] border-[#18181B] w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#18181B] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-center font-black">
                  <Layers className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black font-display text-[#18181B]">Jurnal Rasa Architecture</h3>
                  <p className="text-xs text-[#52525B] font-mono-code font-bold">Personal Food Journal & Taste Map</p>
                </div>
              </div>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="p-1 text-[#18181B] hover:bg-[#FEF08A] rounded-lg border-2 border-transparent hover:border-[#18181B]"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#18181B]">
              <div className="p-3.5 bg-white rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] space-y-1.5">
                <h4 className="font-black font-display text-[#18181B] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FF5533] stroke-[2.5]" />
                  Gemini API (Structured Extraction)
                </h4>
                <p className="text-[#52525B] font-medium leading-relaxed">
                  Extracts food spot information from social media links / captions using model <code className="bg-[#FEF08A] text-[#18181B] px-1 py-0.5 rounded border border-[#18181B] font-mono-code">gemini-2.5-flash</code> with structured JSON schema: restaurant name, city, must-try dishes, price estimate, and culinary tags.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] space-y-1.5">
                <h4 className="font-black font-display text-[#18181B] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  Google Places API & Geocoding
                </h4>
                <p className="text-[#52525B] font-medium leading-relaxed">
                  Validates restaurant entities, official addresses, precise coordinates (latitude/longitude), and Google ratings to display on interactive maps.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] space-y-1.5">
                <h4 className="font-black font-display text-[#18181B] flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  Firestore Dual Schema & Security Rules
                </h4>
                <p className="text-[#52525B] font-medium leading-relaxed">
                  1. <strong>Private Mode</strong>: Saved to <code className="bg-stone-100 px-1 py-0.5 rounded border border-stone-300 font-mono-code">users/{'{userId}'}/saved_places</code> with strict user data isolation.<br />
                  2. <strong>Community Mode</strong>: Aggregated into <code className="bg-stone-100 px-1 py-0.5 rounded border border-stone-300 font-mono-code">public_places/{'{placeId}'}</code> with an atomic increment counter (<code className="font-mono-code">saveCount += 1</code>) for trending community heatmaps.
                </p>
              </div>

              <div className="p-3.5 bg-[#FEF08A] rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] space-y-1">
                <span className="font-black text-[#18181B] font-mono-code uppercase">Secure Cloud Backend</span>
                <p className="text-[#18181B] font-bold">
                  Secure, isolated Express backend keeping all API keys safe server-side.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="bg-[#18181B] text-[#FFFDF7] text-xs font-black py-2 px-5 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#000] hover:bg-black transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t-2 border-[#18181B] bg-[#FFFDF7] py-5 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#52525B] font-medium">
          <div className="flex items-center gap-2">
            <span className="font-black font-display text-[#18181B] text-sm">Jurnal Rasa</span>
            <span>•</span>
            <span className="font-handwriting text-sm text-[#18181B]">Personal Food Journal & Taste Map</span>
          </div>
          <div className="text-[11px] font-mono-code text-[#71716E]">
            <span>Save your favorite culinary spots effortlessly</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
