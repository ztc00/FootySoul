import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGames } from '@/hooks/useGames';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { getErrorMessage } from '@/lib/geocode';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';
import type { Game } from '@/types/database';

const DUBAI_REGION = {
  latitude: 25.2048,
  longitude: 55.2708,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

function hasCoordinates(g: Game): g is Game & { latitude: number; longitude: number } {
  return typeof g.latitude === 'number' && typeof g.longitude === 'number';
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: games = [], isLoading } = useGames();
  const [backfilling, setBackfilling] = useState(false);
  const { user } = useAuth();
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    if (!user || !supabase) return;
    // Use SECURITY DEFINER RPC to bypass profiles RLS recursion
    supabase.rpc('get_my_profile').then(({ data }) => {
      const row = (data as { role?: string }[] | null)?.[0];
      if (row?.role === 'organizer') setIsOrganizer(true);
    });
  }, [user]);

  const gamesWithCoords = useMemo(() => games.filter(hasCoordinates), [games]);
  const gamesNeedingCoords = useMemo(
    () => games.filter((g) => (g.latitude == null || g.longitude == null) && g.address?.trim()),
    [games]
  );

  const runBackfill = async () => {
    if (!supabase || backfilling) return;
    setBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ updated?: number; total?: number; error?: string }>(
        'backfill-game-coordinates'
      );
      if (error) {
        const msg = await getErrorMessage(error);
        throw new Error(msg || error.message || 'Backfill failed');
      }
      if (data?.error) throw new Error(data.error);
      const updated = data?.updated ?? 0;
      const total = data?.total ?? 0;
      queryClient.invalidateQueries({ queryKey: ['games'] });
      if (total === 0) {
        Alert.alert('Done', 'No games needed location updates.');
      } else {
        Alert.alert('Done', `Added map locations for ${updated} of ${total} game(s).`);
      }
    } catch (e) {
      Alert.alert('Error', (e instanceof Error) ? e.message : 'Could not add locations');
    } finally {
      setBackfilling(false);
    }
  };

  const initialRegion = useMemo(() => {
    if (gamesWithCoords.length === 0) return DUBAI_REGION;
    const lats = gamesWithCoords.map((g) => g.latitude!);
    const lngs = gamesWithCoords.map((g) => g.longitude!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const pad = 0.01;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, maxLat - minLat + pad),
      longitudeDelta: Math.max(0.05, maxLng - minLng + pad),
    };
  }, [gamesWithCoords]);

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Loading map...</Text>
      </View>
    );
  }

  if (gamesWithCoords.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <MapView style={StyleSheet.absoluteFill} initialRegion={DUBAI_REGION} />
        <View style={styles.emptyOverlay}>
          <Ionicons name="map-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No game locations on map</Text>
          <Text style={styles.muted}>
            {gamesNeedingCoords.length > 0 && isOrganizer
              ? `${gamesNeedingCoords.length} game(s) have an address but no map location yet. Tap below to add them.`
              : 'Game locations appear here automatically when games are created with an address.'}
          </Text>
          {gamesNeedingCoords.length > 0 && isOrganizer && (
            <TouchableOpacity
              style={[styles.backfillBtn, backfilling && styles.backfillBtnDisabled]}
              onPress={runBackfill}
              disabled={backfilling}
            >
              {backfilling ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="location" size={20} color={colors.white} />
                  <Text style={styles.backfillBtnText}>Add locations for existing games</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion} showsUserLocation>
        {gamesWithCoords.map((game) => (
          <Marker
            key={game.id}
            coordinate={{ latitude: game.latitude!, longitude: game.longitude! }}
            title={game.location_name ?? game.title}
            description={game.title}
            onPress={() =>
              router.push({
                pathname: '/venue-games',
                params: {
                  location_name: game.location_name ?? '',
                  ...(game.place_id ? { place_id: game.place_id } : {}),
                },
              })
            }
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, width: '100%', height: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  emptyOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginTop: spacing[2],
  },
  muted: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing[1], textAlign: 'center', paddingHorizontal: spacing[4] },
  backfillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.accent,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: 8,
    marginTop: spacing[4],
    minWidth: 200,
    justifyContent: 'center',
  },
  backfillBtnDisabled: { opacity: 0.7 },
  backfillBtnText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.white },
});
