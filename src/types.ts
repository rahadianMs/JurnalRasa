export interface UserSavedPlace {
  placeId: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  rating?: number;
  sourceUrl?: string;
  recommendedDishes: string[];
  estimatedPrice?: string;
  tags: string[];
  personalNotes?: string;
  savedAt: string | number;
  vibesOrSummary?: string;
  visited?: boolean; // false = Wishlist (Ingin Dicoba), true = Sudah Dikunjungi
  visitedAt?: string;
  tasteRating?: number; // Personal rating 1-5
  visualCue?: string;
}

export interface PublicPlace {
  placeId: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  rating?: number;
  saveCount: number;
  topDishes: string[];
  tags: string[];
  lastUpdated: string | number;
  vibesOrSummary?: string;
  sourceUrl?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export interface CulinaryParseResult {
  placeId: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  recommendedDishes: string[];
  estimatedPrice: string;
  tags: string[];
  vibesOrSummary: string;
  sourceUrl?: string;
  personalNotes?: string;
  visualCue?: string;
}

export interface ParseApiResponse {
  success: boolean;
  isAIGenerated: boolean;
  isFallback: boolean;
  fallbackNotice?: string;
  isMultiPlace?: boolean;
  reasoningStep?: {
    visualCues?: string[];
    locationReasoning?: string;
  };
  places: CulinaryParseResult[];
  data?: CulinaryParseResult;
  message?: string;
  needManualCaption?: boolean;
  error?: string;
}

export type MapMode = "my_radar" | "community_pulse";

export type AppTab = "journal" | "copilot" | "map" | "community";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface FilterState {
  searchQuery: string;
  selectedCity: string;
  selectedTag: string;
  sortBy: "latest" | "most_saved" | "rating";
}

