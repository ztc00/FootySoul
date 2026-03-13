import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export type FavoriteVenueRow = {
  id: string;
  profile_id: string;
  place_id: string | null;
  location_name: string;
  created_at: string;
};

export function useFavoriteVenues() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['favoriteVenues', user?.id],
    queryFn: async (): Promise<FavoriteVenueRow[]> => {
      if (!user || !supabase) return [];
      // Use SECURITY DEFINER RPC to bypass profiles RLS recursion
      const { data: profileId } = await supabase.rpc('get_my_profile_id');
      if (!profileId) return [];
      const profile = { id: profileId as string };
      const { data, error } = await supabase
        .from('favorite_venues')
        .select('id, profile_id, place_id, location_name, created_at')
        .eq('profile_id', profile.id)
        .order('location_name');
      if (error) throw error;
      return (data ?? []) as FavoriteVenueRow[];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async ({ place_id, location_name }: { place_id: string | null; location_name: string }) => {
      if (!user || !supabase) throw new Error('Not authenticated');
      // Use SECURITY DEFINER RPC to bypass profiles RLS recursion
      const { data: profileId } = await supabase.rpc('get_my_profile_id');
      if (!profileId) throw new Error('Profile not found');
      const { error } = await supabase.from('favorite_venues').insert({
        profile_id: profileId,
        place_id: place_id || null,
        location_name,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favoriteVenues', user?.id] }),
  });

  const removeMutation = useMutation({
    mutationFn: async ({ place_id, location_name }: { place_id: string | null; location_name: string }) => {
      if (!user || !supabase) throw new Error('Not authenticated');
      // Use SECURITY DEFINER RPC to bypass profiles RLS recursion
      const { data: profileId } = await supabase.rpc('get_my_profile_id');
      if (!profileId) throw new Error('Profile not found');
      if (place_id) {
        const { error } = await supabase
          .from('favorite_venues')
          .delete()
          .eq('profile_id', profileId)
          .eq('place_id', place_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorite_venues')
          .delete()
          .eq('profile_id', profileId)
          .eq('location_name', location_name)
          .is('place_id', null);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favoriteVenues', user?.id] }),
  });

  const list = (query.data ?? []) as FavoriteVenueRow[];
  const favoritesForFilter = list.map((r) => ({ place_id: r.place_id, location_name: r.location_name }));

  const isFavorite = (place_id: string | null, location_name: string) =>
    list.some(
      (f) => (f.place_id && place_id && f.place_id === place_id) || (!f.place_id && !place_id && f.location_name === location_name) || (f.place_id === place_id && f.location_name === location_name)
    );

  return {
    data: list,
    favoritesForFilter,
    isLoading: query.isLoading,
    addFavorite: addMutation.mutateAsync,
    removeFavorite: removeMutation.mutateAsync,
    isFavorite,
  };
}
