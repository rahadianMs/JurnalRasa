import React, { useState, useEffect, useMemo } from "react";
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  increment,
  serverTimestamp,
  type User,
} from "./lib/firebase";
import {
  UserSavedPlace,
  PublicPlace,
  UserProfile,
  CulinaryParseResult,
  MapMode,
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
  const [mode, setMode] = useState<MapMode>("community_pulse");

  const [myPlaces, setMyPlaces] = useState<UserSavedPlace[]>(INITIAL_USER_SAVED_PLACES);
  const [publicPlaces, setPublicPlaces] = useState<PublicPlace[]>(INITIAL_PUBLIC_PLACES);

  const [selectedPlace, setSelectedPlace] = useState<PublicPlace | UserSavedPlace | null>(null);
  const [isCuratorOpen, setIsCuratorOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("Semua Kota");
  const [selectedTag, setSelectedTag] = useState("Semua Kategori");
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
          displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? "Tamu Foodie" : "Pengguna"),
          photoURL: firebaseUser.photoURL,
          isAnonymous: firebaseUser.isAnonymous,
        });
      } else {
        // Automatically create anonymous user session for zero-friction trial if not logged in
        signInAnonymously(auth).catch((err) => {
          console.warn("Anonymous auth failed, fallback to local guest session:", err);
          setUser({
            uid: "guest_session_" + Date.now().toString(36),
            email: null,
            displayName: "Tamu Penjelajah Rasa",
            photoURL: null,
            isAnonymous: true,
          });
        });
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
      showToast("Berhasil masuk dengan akun Google!");
    } catch (err: any) {
      console.error("Google sign in error:", err);
      showToast("Gagal masuk dengan Google: " + (err.message || ""));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showToast("Berhasil keluar.");
    } catch (err) {
      console.error(err);
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
    showToast(`"${parsed.name}" berhasil ditambahkan ke Radar Anda & Peta Komunitas!`);

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
    showToast(`${items.length} tempat kuliner berhasil ditambahkan ke Radar & Peta!`);

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
      showToast("Tempat ini sudah ada di Radar Anda!");
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
      personalNotes: "Disimpan dari rekomendasi trending komunitas",
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
    showToast(`"${publicPlace.name}" berhasil disimpan ke Radar Saya!`);

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
    showToast("Tempat dihapus dari Radar Anda.");

    await runWithTimeout(deleteDoc(doc(db, "users", currentUserId, "saved_places", placeId)));
  };

  // Filtered and Sorted Places
  const activePlaces = useMemo(() => {
    const list = mode === "my_radar" ? myPlaces : publicPlaces;

    return list.filter((p) => {
      // City filter
      if (selectedCity !== "Semua Kota" && !p.city.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false;
      }
      // Tag filter
      if (selectedTag !== "Semua Kategori" && !(p.tags || []).some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
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

  return (
    <div className="min-h-screen bg-[#F4F4F2] flex flex-col font-sans text-[#1A1A1A]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#1A1A1A] text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-slide-down border border-black/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-stone-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        mode={mode}
        onModeChange={(newMode) => {
          setMode(newMode);
          setSelectedPlace(null);
        }}
        onOpenCurator={() => setIsCuratorOpen(true)}
        user={user}
        onSignIn={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        mySavesCount={myPlaces.length}
        communityCount={publicPlaces.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Top Bento Stats Overview */}
        <StatsBar myPlaces={myPlaces} publicPlaces={publicPlaces} mode={mode} />

        {/* Filter and Search Bar (Bento Control Module) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71716E]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama resto, menu (misal: gulai, sate), atau area..."
              className="w-full pl-10 pr-4 py-2.5 bg-black/[0.03] border border-black/[0.08] rounded-xl text-xs sm:text-sm text-[#1A1A1A] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5C35] focus:bg-white transition-all font-medium"
            />
          </div>

          {/* City, Tag & Sort Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* City Select */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.08] text-[#1A1A1A] text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C35] transition-colors"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  📍 {c}
                </option>
              ))}
            </select>

            {/* Tag Select */}
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.08] text-[#1A1A1A] text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C35] transition-colors"
            >
              {POPULAR_TAGS.map((t) => (
                <option key={t} value={t}>
                  🏷️ {t}
                </option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.08] text-[#1A1A1A] text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C35] transition-colors"
            >
              <option value="most_saved">🔥 Terbanyak Disimpan</option>
              <option value="rating">⭐ Rating Tertinggi</option>
              <option value="latest">🕒 Terbaru</option>
            </select>

            {/* Info modal trigger */}
            <button
              onClick={() => setIsInfoModalOpen(true)}
              title="Informasi Arsitektur Google Cloud Gen AI & Hackathon"
              className="p-2 text-[#71716E] hover:text-[#1A1A1A] hover:bg-black/[0.04] rounded-xl transition-colors shrink-0"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Bento Panel Layout: Interactive Map + Places Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Map Column (Sticky on Desktop) */}
          <div className="lg:col-span-6 xl:col-span-7 h-[440px] lg:h-[calc(100vh-220px)] lg:sticky lg:top-24">
            <FoodMap
              mode={mode}
              places={activePlaces}
              selectedPlace={selectedPlace}
              onSelectPlace={(p) => setSelectedPlace(p)}
              onSaveToMyRadar={handleSaveCommunityToMyRadar}
              onDelete={handleDeleteFromMyRadar}
              userSavedPlaceIds={userSavedPlaceIds}
            />
          </div>

          {/* Cards Feed Column */}
          <div className="lg:col-span-6 xl:col-span-5 space-y-3.5">
            {/* Feed Section Title */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#71716E] flex items-center gap-1.5">
                  {mode === "my_radar" ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-[#1A1A1A]">Daftar Radar Saya ({activePlaces.length})</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4 text-[#FF5C35]" />
                      <span className="text-[#1A1A1A]">Peta Panas Komunitas ({activePlaces.length} Tempat)</span>
                    </>
                  )}
                </h2>
                <p className="text-xs text-[#71716E] mt-0.5">
                  {mode === "my_radar"
                    ? "Koleksi kuliner pribadi dari media sosial dengan catatan personal"
                    : "Peringkat tempat makan terpopuler berdasarkan frekuensi bookmark"}
                </p>
              </div>

              {mode === "my_radar" && activePlaces.length === 0 && (
                <button
                  onClick={() => setIsCuratorOpen(true)}
                  className="text-xs text-[#FF5C35] hover:text-[#E84A23] font-bold"
                >
                  + Tambah Sekarang
                </button>
              )}
            </div>

            {/* Places List */}
            {activePlaces.length > 0 ? (
              <div className="space-y-3">
                {activePlaces.map((place) => (
                  <PlaceCard
                    key={place.placeId}
                    place={place}
                    mode={mode}
                    isSelected={selectedPlace?.placeId === place.placeId}
                    onSelect={() => setSelectedPlace(place)}
                    onDelete={handleDeleteFromMyRadar}
                    onSaveToMyRadar={handleSaveCommunityToMyRadar}
                    isSavedInMyRadar={userSavedPlaceIds.has(place.placeId)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 text-center border border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FF5C35]/10 text-[#FF5C35] mx-auto flex items-center justify-center font-bold">
                  <Utensils className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A]">Belum ada tempat kuliner ditemukan</h3>
                  <p className="text-xs text-[#71716E] max-w-sm mx-auto mt-1">
                    {searchQuery || selectedCity !== "Semua Kota" || selectedTag !== "Semua Kategori"
                      ? "Coba ubah filter kota atau kata kunci pencarian Anda."
                      : mode === "my_radar"
                      ? "Anda belum menyimpan rekomendasi di Radar Anda. Tempel link TikTok atau Instagram untuk memulai!"
                      : "Jadilah yang pertama mengkurasi tempat makan viral!"}
                  </p>
                </div>
                <button
                  onClick={() => setIsCuratorOpen(true)}
                  className="inline-flex items-center gap-2 bg-[#FF5C35] hover:bg-[#E84A23] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kurasi Link Media Sosial Sekarang</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Curator AI Modal */}
      <CuratorModal
        isOpen={isCuratorOpen}
        onClose={() => setIsCuratorOpen(false)}
        onSaveSuccess={handleSaveCulinaryPlace}
        onSaveMultiple={handleSaveMultipleCulinaryPlaces}
      />

      {/* Google Sign-in / Account Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-black/[0.08] w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#FF5C35]/10 text-[#FF5C35] flex items-center justify-center font-bold">
                  <LogIn className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1A1A]">Masuk ke RasaRadar</h3>
                  <p className="text-xs text-[#71716E]">Akses koleksi privat & sinkronisasi Firestore</p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 text-[#71716E] hover:text-[#1A1A1A] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#71716E] leading-relaxed">
              Dengan masuk, koleksi kuliner yang Anda kurasi dari TikTok dan Instagram akan tersimpan aman di subcollection privat <code className="bg-black/[0.04] px-1.5 py-0.5 rounded text-[#1A1A1A]">users/{'{userId}'}/saved_places</code> dengan isolasi ketat Firestore Security Rules.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-black/[0.02] text-[#1A1A1A] font-bold py-2.5 px-4 rounded-xl border border-black/[0.12] shadow-sm text-xs transition-colors"
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
                <span>Lanjutkan dengan Google</span>
              </button>

              <button
                onClick={() => {
                  setIsAuthModalOpen(false);
                  showToast("Anda menjelajah dalam mode akun tamu otomatis.");
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-[#71716E] hover:text-[#1A1A1A] bg-black/[0.04] hover:bg-black/[0.08] rounded-xl transition-colors"
              >
                Tetap Gunakan Mode Tamu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info & Hackathon Architecture Modal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-black/[0.08] w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#FF5C35]/10 text-[#FF5C35] flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1A1A]">Arsitektur RasaRadar</h3>
                  <p className="text-xs text-[#71716E]">Google Cloud Gen AI Academy APAC (Cohort 3)</p>
                </div>
              </div>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="p-1 text-[#71716E] hover:text-[#1A1A1A] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#1A1A1A]">
              <div className="p-3.5 bg-black/[0.02] rounded-2xl border border-black/[0.06] space-y-1.5">
                <h4 className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF5C35]" />
                  Gemini API (Structured Extraction)
                </h4>
                <p className="text-[#71716E]">
                  Mengekstrak informasi tempat makan dari tautan media sosial / caption menggunakan model <code>gemini-3.6-flash</code> dengan output skema JSON kaku: nama restoran, kota, menu wajib coba, estimasi harga, dan tag kuliner.
                </p>
              </div>

              <div className="p-3.5 bg-black/[0.02] rounded-2xl border border-black/[0.06] space-y-1.5">
                <h4 className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Google Places API & Geocoding
                </h4>
                <p className="text-[#71716E]">
                  Memvalidasi entitas restoran, alamat resmi, koordinat geografis presisi (latitude/longitude), dan Google rating untuk disematkan pada peta interaktif.
                </p>
              </div>

              <div className="p-3.5 bg-black/[0.02] rounded-2xl border border-black/[0.06] space-y-1.5">
                <h4 className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" />
                  Firestore Dual Schema & Security Rules
                </h4>
                <p className="text-[#71716E]">
                  1. <strong>Mode Privat</strong>: Disimpan pada <code>users/{'{userId}'}/saved_places</code> dengan aturan isolasi data ketat per pengguna.<br />
                  2. <strong>Mode Kolektif</strong>: Diagregasi ke <code>public_places/{'{placeId}'}</code> dengan atomic increment counter (<code>saveCount += 1</code>) untuk menampilkan peta panas kuliner terpopuler.
                </p>
              </div>

              <div className="p-3.5 bg-[#FF5C35]/10 rounded-2xl border border-[#FF5C35]/20 space-y-1">
                <span className="font-bold text-[#FF5C35]">#AccelerateAIwithCloudRun</span>
                <p className="text-[#1A1A1A]">
                  Backend Express terintegrasi dengan Google Cloud Run dan aman tanpa kebocoran API key di sisi klien.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="bg-[#1A1A1A] text-white text-xs font-semibold py-2 px-4 rounded-xl hover:bg-black transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-black/[0.08] bg-white py-5 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#71716E]">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#1A1A1A]">RasaRadar</span>
            <span>•</span>
            <span>AI-Powered Social Food Curator & Community Map</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-[#FF5C35]/10 text-[#FF5C35] font-bold px-2 py-0.5 rounded-full border border-[#FF5C35]/20">
              #AccelerateAIwithCloudRun
            </span>
            <span>Google Cloud Gen AI Academy APAC (Cohort 3)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
