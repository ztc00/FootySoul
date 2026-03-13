import { useMemo, useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGames, useBookingCounts } from '@/hooks/useGames';
import { GameCard } from '@/components/GameCard';
import { Ionicons } from '@expo/vector-icons';
import type { Game } from '@/types/database';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';

export default function VenueGamesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ location_name: string; place_id?: string }>();
  const locationName = params.location_name ?? '';
  const placeId = params.place_id ?? null;
  const { data: games = [], isLoading, refetch } = useGames();
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    return games.filter(
      (g) =>
        (placeId && g.place_id === placeId) ||
        (!placeId && g.location_name === locationName) ||
        (g.place_id === placeId && g.location_name === locationName)
    );
  }, [games, locationName, placeId]);

  const gameIds = useMemo(() => filtered.map((g) => g.id), [filtered]);
  const { data: counts = {} } = useBookingCounts(gameIds);

  useEffect(() => {
    navigation.setOptions({ title: locationName || 'Games at venue' });
  }, [navigation, locationName]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderGame = ({ item }: { item: Game }) => (
    <GameCard
      game={item}
      spotsFilled={counts[item.id] ?? 0}
      locked={item.visibility === 'invite_only'}
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (filtered.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="location-outline" size={48} color={colors.border} />
        <Text style={styles.emptyTitle}>No upcoming games here</Text>
        <Text style={styles.muted}>Check back later or browse other venues</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      renderItem={renderGame}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.list,
        { paddingTop: spacing[2], paddingBottom: insets.bottom + spacing[8] },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[4] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  emptyTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.text, marginTop: spacing[3] },
  muted: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing[1], textAlign: 'center' },
});
