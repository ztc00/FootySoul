import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export type VenueStats = {
  venueName: string;
  placeId: string | null;
  gameCount: number;
  totalRevenue: number;
  avgRating: number;
  ratingCount: number;
  playAgainCount: number;
};

export type OrganizerStats = {
  totalGames: number;
  totalRevenue: number;
  organizerRating: number;
  ratingCount: number;
  playAgainPct: number;
  gamesThisMonth: number;
  venues: VenueStats[];
  topVenueByBookings: VenueStats | null;
  topVenueByRevenue: VenueStats | null;
  topVenueByRating: VenueStats | null;
};

const EMPTY: OrganizerStats = {
  totalGames: 0,
  totalRevenue: 0,
  organizerRating: 0,
  ratingCount: 0,
  playAgainPct: 0,
  gamesThisMonth: 0,
  venues: [],
  topVenueByBookings: null,
  topVenueByRevenue: null,
  topVenueByRating: null,
};

/**
 * Organizer stats — all aggregation is done server-side via
 * the `get_organizer_stats` SECURITY DEFINER function (migration 016).
 * Previously this hook fetched every game, booking, and feedback row
 * to the client and aggregated in JS.
 */
export function useOrganizerStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['organizerStats', user?.id],
    queryFn: async (): Promise<OrganizerStats> => {
      if (!user || !supabase) return EMPTY;

      const { data, error } = await supabase.rpc('get_organizer_stats');
      if (error) throw error;
      if (!data || typeof data !== 'object') return EMPTY;

      const raw = data as Record<string, unknown>;
      const venues = (Array.isArray(raw.venues) ? raw.venues : []) as VenueStats[];

      return {
        totalGames: Number(raw.totalGames ?? 0),
        totalRevenue: Number(raw.totalRevenue ?? 0),
        organizerRating: Number(raw.organizerRating ?? 0),
        ratingCount: Number(raw.ratingCount ?? 0),
        playAgainPct: Number(raw.playAgainPct ?? 0),
        gamesThisMonth: Number(raw.gamesThisMonth ?? 0),
        venues,
        topVenueByBookings: venues[0] ?? null,
        topVenueByRevenue:
          [...venues].sort((a, b) => b.totalRevenue - a.totalRevenue)[0] ?? null,
        topVenueByRating:
          [...venues]
            .filter((v) => v.ratingCount >= 1)
            .sort((a, b) => b.avgRating - a.avgRating)[0] ?? null,
      };
    },
    enabled: !!user,
  });
}
