import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Game } from '@/types/database';

export function useGames() {
  return useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not configured — check EXPO_PUBLIC_SUPABASE_URL in .env.local');
      const { data, error } = await supabase
        .from('games')
        .select('*, organizer:organizers(*)')
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Game[];
    },
  });
}

export function useGame(gameId: string) {
  return useQuery({
    queryKey: ['game', gameId],
    queryFn: async () => {
      if (!supabase) throw new Error('Not configured');
      const { data, error } = await supabase
        .from('games')
        .select('*, organizer:organizers(*)')
        .eq('id', gameId)
        .single();
      if (error) throw error;
      return data as Game;
    },
    enabled: !!gameId,
  });
}

export function useMyBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bookings', user?.id],
    queryFn: async () => {
      if (!user || !supabase) return [];
      // Use SECURITY DEFINER RPC to bypass profiles RLS recursion
      const { data: profileId } = await supabase.rpc('get_my_profile_id');
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('*, game:games(*)')
        .eq('player_id', profileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const now = new Date();
      const upcoming = (data ?? []).filter(
        (b: { game?: { end_time?: string } }) => b.game && new Date(b.game.end_time) >= now
      );
      const sorted = upcoming.sort(
        (a: { game: { start_time: string } }, b: { game: { start_time: string } }) =>
          new Date(a.game.start_time).getTime() - new Date(b.game.start_time).getTime()
      );
      return sorted;
    },
    enabled: !!user,
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (gameData: Omit<Game, 'id' | 'organizer_id' | 'created_at' | 'updated_at'>) => {
      if (!user || !supabase) throw new Error('Not authenticated');
      // Use SECURITY DEFINER RPC to bypass profiles RLS recursion
      const { data: organizerId, error: orgIdError } = await supabase.rpc('get_my_organizer_id');
      if (orgIdError) throw orgIdError;
      if (!organizerId) throw new Error('Organizer profile not found. Make sure you have become an organizer first.');
      const { data, error } = await supabase
        .from('games')
        .insert({ ...gameData, organizer_id: organizerId, currency: 'AED' })
        .select()
        .single();
      if (error) throw error;
      return data as Game;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useBookingCounts(gameIds: string[]) {
  return useQuery({
    queryKey: ['bookingCounts', gameIds.sort().join(',')],
    queryFn: async () => {
      if (!supabase || gameIds.length === 0) return {} as Record<string, number>;
      const { data, error } = await supabase
        .rpc('get_booking_counts', { game_ids: gameIds });
      if (error) throw error;
      const counts: Record<string, number> = {};
      gameIds.forEach((id) => (counts[id] = 0));
      (data ?? []).forEach((r: { game_id: string; total_spots: number }) => {
        counts[r.game_id] = Number(r.total_spots ?? 0);
      });
      return counts;
    },
    enabled: gameIds.length > 0,
  });
}
