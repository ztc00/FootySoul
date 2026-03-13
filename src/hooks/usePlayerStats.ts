import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export type PlayerStats = {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  goals: number;
  assists: number;
  motm: number;
};

export function usePlayerStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['playerStats', user?.id],
    queryFn: async (): Promise<PlayerStats> => {
      const empty = { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, goals: 0, assists: 0, motm: 0 };
      if (!user || !supabase) return empty;
      // Use SECURITY DEFINER RPC to bypass profiles RLS recursion
      const { data: profileId } = await supabase.rpc('get_my_profile_id');
      if (!profileId) return empty;
      const profile = { id: profileId as string };

      const [bookingsRes, statsRes, motmRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('player_id', profile.id)
          .eq('status', 'confirmed'),
        supabase
          .from('player_game_stats')
          .select('goals, assists, result')
          .eq('player_id', profile.id),
        supabase
          .from('feedback')
          .select('id', { count: 'exact', head: true })
          .eq('motm_user_id', user.id),
      ]);

      const gamesPlayed = bookingsRes.count ?? 0;
      const rows = (statsRes.data ?? []) as { goals: number; assists: number; result: string }[];
      let wins = 0, losses = 0, draws = 0, goals = 0, assists = 0;
      rows.forEach((r) => {
        goals += r.goals ?? 0;
        assists += r.assists ?? 0;
        if (r.result === 'win') wins++;
        else if (r.result === 'loss') losses++;
        else if (r.result === 'draw') draws++;
      });
      const motm = motmRes.count ?? 0;

      return {
        gamesPlayed,
        wins,
        losses,
        draws,
        goals,
        assists,
        motm,
      };
    },
    enabled: !!user,
  });
}
