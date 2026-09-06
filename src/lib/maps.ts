/**
 * Helper to generate Google Maps URLs targeting registered places and addresses
 * instead of raw GPS coordinates.
 *
 * Universal URL Documentation:
 * - Directions: https://www.google.com/maps/dir/?api=1&destination=<destination>&destination_place_id=<place_id>
 * - Search: https://www.google.com/maps/search/?api=1&query=<query>&query_place_id=<place_id>
 */

export function getGoogleMapsUrl(
  place: {
    name: string;
    address?: string;
    city?: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  },
  action: "directions" | "search" = "directions"
): string {
  const cleanName = (place.name || "").trim();
  const addressPart = (place.address || place.city || "").trim();

  // Combine place name and address so Google Maps resolves to the official registered place
  let queryText = cleanName;
  if (addressPart && !cleanName.toLowerCase().includes(addressPart.toLowerCase())) {
    queryText = `${cleanName}, ${addressPart}`;
  }

  // Fallback to coordinates only if no descriptive name or address exists
  if (!queryText && place.lat && place.lng) {
    queryText = `${place.lat},${place.lng}`;
  }

  // Check if placeId is a genuine Google Place ID (e.g. ChIJ...) rather than an applet mock ID
  const isRealGooglePlaceId =
    Boolean(place.placeId) &&
    place.placeId!.startsWith("ChIJ") &&
    !place.placeId!.includes("_") &&
    place.placeId!.length >= 20;

  if (action === "directions") {
    const params = new URLSearchParams({
      api: "1",
      destination: queryText,
    });
    if (isRealGooglePlaceId && place.placeId) {
      params.set("destination_place_id", place.placeId);
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  } else {
    const params = new URLSearchParams({
      api: "1",
      query: queryText,
    });
    if (isRealGooglePlaceId && place.placeId) {
      params.set("query_place_id", place.placeId);
    }
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }
}
