import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Game } from '@/types/database';

export type ReplayItem = { id: string; game: Game };

export function useMyReplays() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['myReplays', user?.id],
    queryFn: async (): Promise<ReplayItem[]> => {
      if (!user || !supabase) return [];
      // Use SECURITY DEFINER RPC to bypass profiles RLS recursion
      const { data: profileId } = await supabase.rpc('get_my_profile_id');
      if (!profileId) return [];
      const profile = { id: profileId as string };
      const now = new Date().toISOString();
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('game_id')
        .eq('player_id', profile.id)
        .eq('status', 'confirmed');
      if (error) throw error;
      const gameIds = [...new Set((bookings ?? []).map((b) => b.game_id))];
      if (gameIds.length === 0) return [];
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*, organizer:organizers(*)')
        .in('id', gameIds)
        .lt('end_time', now)
        .order('end_time', { ascending: false });
      if (gamesError) throw gamesError;
      return (games ?? []).map((g) => ({ id: g.id, game: g as Game }));
    },
    enabled: !!user,
  });
}
