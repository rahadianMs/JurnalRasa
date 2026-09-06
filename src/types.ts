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
}

export interface ParseApiResponse {
  success: boolean;
  isAIGenerated: boolean;
  isFallback: boolean;
  fallbackNotice?: string;
  isMultiPlace?: boolean;
  places: CulinaryParseResult[];
  data?: CulinaryParseResult;
  message?: string;
  needManualCaption?: boolean;
  error?: string;
}

export type MapMode = "my_radar" | "community_pulse";

export interface FilterState {
  searchQuery: string;
  selectedCity: string;
  selectedTag: string;
  sortBy: "latest" | "most_saved" | "rating";
}
