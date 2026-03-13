import { format } from 'date-fns';
import type { Game } from '@/types/database';
import type { DiscoverFiltersState } from '@/types/filters';

export type BookingCounts = Record<string, number>;

function getHour(iso: string): number {
  return new Date(iso).getHours();
}

/** Filter games to those starting on the given calendar day (YYYY-MM-DD). */
export function filterGamesByDate(games: Game[], selectedDate: string | null): Game[] {
  if (!selectedDate) return games;
  return games.filter((g) => format(new Date(g.start_time), 'yyyy-MM-dd') === selectedDate);
}

export type FavoriteVenue = { place_id: string | null; location_name: string };

function gameMatchesFavorites(g: Game, favorites: FavoriteVenue[]): boolean {
  if (favorites.length === 0) return false;
  return favorites.some(
    (f) =>
      (f.place_id && g.place_id === f.place_id) ||
      (!f.place_id && g.location_name === f.location_name) ||
      (f.place_id === g.place_id && g.location_name === f.location_name)
  );
}

export function filterGamesByFilters(
  games: Game[],
  filters: DiscoverFiltersState,
  favoriteVenues: FavoriteVenue[] = [],
  counts: BookingCounts = {}
): Game[] {
  return games.filter((g) => {
    if (filters.selectedDate !== null) {
      if (format(new Date(g.start_time), 'yyyy-MM-dd') !== filters.selectedDate) return false;
    }
    if (filters.favoriteVenuesOnly) {
      if (filters.selectedFavoriteVenue) {
        // Show only this specific favourite venue
        const specific = favoriteVenues.filter(
          (f) => f.location_name === filters.selectedFavoriteVenue
        );
        if (!gameMatchesFavorites(g, specific)) return false;
      } else {
        // Show all favourite venues
        if (!gameMatchesFavorites(g, favoriteVenues)) return false;
      }
    }
    const spotsFilled = counts[g.id] ?? 0;
    const freeSlots = Math.max(0, g.capacity - spotsFilled);
    if (filters.minFreeSlots > 0 && freeSlots < filters.minFreeSlots) return false;
    const pitch = (g.pitch_type || '5-a-side') as string;
    if (filters.pitchType !== 'any' && pitch !== filters.pitchType) return false;
    if (filters.price === 'free' && g.price > 0) return false;
    if (filters.price === 'under_30' && g.price >= 30) return false;
    if (filters.price === 'under_50' && g.price >= 50) return false;
    const h = getHour(g.start_time);
    if (filters.time === 'morning' && (h < 6 || h >= 12)) return false;
    if (filters.time === 'afternoon' && (h < 12 || h >= 17)) return false;
    if (filters.time === 'evening' && (h < 17 || h >= 21)) return false;
    return true;
  });
}
