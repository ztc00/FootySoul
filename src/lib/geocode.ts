import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type GeocodeResult = { latitude: number; longitude: number };

export type AddressSuggestion = {
  label: string;
  address: string;
  /** Short venue/place name (e.g. "Al Wasl Sports Club"), separate from the full formatted address. */
  location_name?: string;
  /** Mapbox or Google place ID for reliable deduplication. */
  place_id?: string;
  latitude?: number;
  longitude?: number;
};

/** Parse error message from Edge Function response body (for non-2xx). */
export async function getErrorMessage(error: unknown): Promise<string | null> {
  if (error instanceof FunctionsHttpError && error.context) {
    try {
      const res = error.context as Response;
      const text = await res.text();
      if (text) {
        try {
          const data = JSON.parse(text) as { error?: string };
          if (typeof data?.error === 'string' && data.error) return data.error;
        } catch {
          if (text.length < 200) return text;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Convert an address string to latitude/longitude using the backend geocoder (Nominatim).
 * Returns null if geocoding fails or address is empty.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address?.trim();
  if (!trimmed || !supabase) return null;

  const { data, error } = await supabase.functions.invoke<GeocodeResult>('geocode-address', {
    body: { address: trimmed },
  });

  if (error) {
    const msg = await getErrorMessage(error);
    if (msg) throw new Error(msg);
    return null;
  }
  if (data?.latitude != null && data?.longitude != null) {
    return { latitude: data.latitude, longitude: data.longitude };
  }
  return null;
}

/** Mapbox public token from env (optional). If set, we call Mapbox directly from the app. */
function getMapboxToken(): string | null {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    return process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  }
  return null;
}

/** Google Maps API key from env. */
function getGoogleKey(): string | null {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  }
  return null;
}

type GooglePrediction = {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
};
type GoogleAutocompleteResponse = { status: string; predictions: GooglePrediction[] };

type GooglePlaceDetailsResponse = {
  status: string;
  result: {
    name: string;
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    photos?: { photo_reference: string }[];
  };
};

export type VenueDetails = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  photoReference?: string;
};

/**
 * Search for venues using Google Places Autocomplete.
 * Returns suggestions biased to the UAE / Dubai area.
 * Falls back to Mapbox if Google key is not configured.
 */
export async function searchVenues(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query?.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const key = getGoogleKey();
  if (!key) {
    // Fall back to Mapbox address suggestions
    return suggestAddresses(query, 'Dubai');
  }

  const params = new URLSearchParams({
    input: trimmed,
    types: 'establishment',
    location: '25.2048,55.2708', // Dubai centre
    radius: '50000',
    key,
  });

  const r = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
  );
  if (!r.ok) return [];
  const data = (await r.json()) as GoogleAutocompleteResponse;
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];

  return (data.predictions ?? []).map((p) => ({
    label: p.description,
    address: p.description,
    location_name: p.structured_formatting.main_text,
    place_id: p.place_id,
  }));
}

/**
 * Fetch full venue details (address, coordinates, first photo reference) from Google Places.
 * Returns null if the key is missing or the request fails.
 */
export async function getVenueDetails(placeId: string): Promise<VenueDetails | null> {
  const key = getGoogleKey();
  if (!key) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_address,geometry,photos',
    key,
  });

  const r = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  );
  if (!r.ok) return null;
  const data = (await r.json()) as GooglePlaceDetailsResponse;
  if (data.status !== 'OK') return null;

  const { result } = data;
  return {
    name: result.name,
    address: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    photoReference: result.photos?.[0]?.photo_reference,
  };
}

/**
 * Build a Google Places photo URL from a photo_reference string.
 * The key is already public in the app bundle so embedding it in the URL is fine.
 */
export function buildPlacePhotoUrl(photoReference: string, maxWidth = 800): string {
  const key = getGoogleKey() ?? '';
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${encodeURIComponent(photoReference)}&key=${key}`;
}

type MapboxFeature = {
  id: string;
  place_name: string;
  /** Short name of the place itself (without surrounding context). */
  text?: string;
  geometry?: { coordinates: [number, number] }; // [longitude, latitude]
};
type MapboxResponse = { features?: MapboxFeature[] };

/**
 * Get autocomplete suggestions for a partial address.
 * If locationContext (e.g. venue/location name) is provided, it is prepended to the search so
 * suggestions are biased toward that place (e.g. "Dubai Sports City, Dubai").
 * If EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN is set in .env.local, calls Mapbox directly from the app.
 */
export async function suggestAddresses(query: string, locationContext?: string | null): Promise<AddressSuggestion[]> {
  const trimmed = query?.trim();
  if (!trimmed || trimmed.length < 3) return [];

  const searchQuery = locationContext?.trim()
    ? `${locationContext.trim()}, ${trimmed}`
    : trimmed;

  const mapboxToken = getMapboxToken();
  if (mapboxToken) {
    try {
      const types = 'address,place,locality,poi';
      const country = 'AE';
      const limit = 5;
      const base = `https://api.mapbox.com/geocoding/v5/mapbox.places`;
      const fetchSuggestions = async (q: string): Promise<MapboxFeature[]> => {
        const enc = encodeURIComponent(q);
        const u = `${base}/${enc}.json?autocomplete=true&limit=${limit}&types=${types}&country=${country}&access_token=${mapboxToken}`;
        const r = await fetch(u);
        if (!r.ok) return [];
        const d = (await r.json()) as MapboxResponse;
        return d.features ?? [];
      };
      let features = await fetchSuggestions(searchQuery);
      if (features.length === 0 && !searchQuery.toLowerCase().includes('dubai')) {
        features = await fetchSuggestions(`${searchQuery}, Dubai`);
      }
      if (features.length === 0 && locationContext?.trim() && trimmed !== searchQuery) {
        features = await fetchSuggestions(`${trimmed}, Dubai`);
      }
      return features.map((f) => ({
        label: f.place_name,
        address: f.place_name,
        location_name: f.text || f.place_name.split(',')[0].trim(),
        place_id: f.id,
        latitude: f.geometry?.coordinates[1],
        longitude: f.geometry?.coordinates[0],
      }));
    } catch (e) {
      throw e instanceof Error ? e : new Error('Mapbox request failed');
    }
  }

  if (!supabase) throw new Error('Supabase is not configured. Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to .env.local for address suggestions.');
  const { data, error } = await supabase.functions.invoke<AddressSuggestion[]>('geocode-suggest', {
    body: { query: searchQuery },
  });
  if (error) {
    const msg = await getErrorMessage(error);
    if (msg) throw new Error(msg);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

