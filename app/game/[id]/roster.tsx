import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { format } from 'date-fns';
import { useGame } from '@/hooks/useGames';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';
import { AvatarCircle } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';

function firstNameLastInitial(name: string | null): string {
  if (!name || !name.trim()) return 'Player';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  return parts[0];
}

export default function RosterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { data: game } = useGame(id ?? '');
  const [players, setPlayers] = useState<{ id: string; name: string | null; nickname: string | null; paid?: boolean; isGuest?: boolean }[]>([]);
  const [waitlisted, setWaitlisted] = useState<{ id: string; name: string | null; nickname: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (game) {
      navigation.setOptions({ title: format(new Date(game.start_time), 'EEE ha') + ' · ' + game.location_name });
    }
  }, [game, navigation]);

  const fetchPlayers = useCallback(async () => {
    if (!game?.id || !supabase) return;

    // Use SECURITY DEFINER RPC to bypass bookings/profiles RLS
    const { data: rows } = await supabase
      .rpc('get_game_booking_details', { p_game_id: game.id });

    const confirmed = (rows ?? []).filter((r: { status: string }) => r.status === 'confirmed');
    const waitlistedRows = (rows ?? []).filter((r: { status: string }) => r.status === 'waitlisted');

    // Expand bookings with spots > 1 into extra "Guest" entries so the
    // roster total matches the spots count shown on the game page / home card.
    const expanded: { id: string; name: string | null; nickname: string | null; paid?: boolean; isGuest?: boolean }[] = [];
    for (const r of confirmed as { player_id: string; player_name: string; player_nickname: string; spots: number; paid_amount: number; stripe_payment_intent_id: string }[]) {
      expanded.push({
        id: r.player_id,
        name: r.player_name,
        nickname: r.player_nickname ?? null,
        paid: (r.paid_amount ?? 0) > 0 || !!r.stripe_payment_intent_id,
      });
      for (let i = 1; i < (r.spots ?? 1); i++) {
        expanded.push({ id: `${r.player_id}-guest-${i}`, name: 'Guest', nickname: null, isGuest: true });
      }
    }
    setPlayers(expanded);

    setWaitlisted(waitlistedRows.map((r: { player_id: string; player_name: string; player_nickname: string }) => ({
      id: r.player_id,
      name: r.player_name,
      nickname: r.player_nickname ?? null,
    })));
  }, [game?.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchPlayers();
      setLoading(false);
    })();
  }, [fetchPlayers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlayers();
    setRefreshing(false);
  }, [fetchPlayers]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (players.length === 0 && waitlisted.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="people-outline" size={48} color={colors.border} />
        <Text style={styles.emptyTitle}>No players yet</Text>
        <Text style={styles.emptyHint}>Players who book will appear here</Text>
      </View>
    );
  }

  const half = Math.ceil(players.length / 2);
  const teamA = players.slice(0, half);
  const teamB = players.slice(half);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {players.length > 0 && (
        <>
          <View style={styles.teamHeader}>
            <Text style={styles.teamTitle}>Team A</Text>
            <Text style={styles.teamSpots}>{teamA.length}/{Math.ceil((game?.capacity ?? 0) / 2)}</Text>
          </View>
          <View style={styles.grid}>
            {teamA.map((p) => (
              <View key={p.id} style={[styles.cell, p.isGuest && styles.cellGuest]}>
                <AvatarCircle name={p.isGuest ? null : p.name} size={48} />
                <Text style={[styles.name, p.isGuest && styles.nameGuest]}>{p.isGuest ? 'Guest' : firstNameLastInitial(p.name)}</Text>
                {!p.isGuest && p.nickname ? <Text style={styles.nickname}>{p.nickname}</Text> : null}
              </View>
            ))}
          </View>
          <View style={styles.teamHeader}>
            <Text style={styles.teamTitle}>Team B</Text>
            <Text style={styles.teamSpots}>{teamB.length}/{Math.floor((game?.capacity ?? 0) / 2)}</Text>
          </View>
          <View style={styles.grid}>
            {teamB.map((p) => (
              <View key={p.id} style={[styles.cell, p.isGuest && styles.cellGuest]}>
                <AvatarCircle name={p.isGuest ? null : p.name} size={48} />
                <Text style={[styles.name, p.isGuest && styles.nameGuest]}>{p.isGuest ? 'Guest' : firstNameLastInitial(p.name)}</Text>
                {!p.isGuest && p.nickname ? <Text style={styles.nickname}>{p.nickname}</Text> : null}
              </View>
            ))}
          </View>
        </>
      )}

      {waitlisted.length > 0 && (
        <>
          <View style={styles.waitlistHeader}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={styles.waitlistTitle}>Waitlist ({waitlisted.length})</Text>
          </View>
          <View style={styles.grid}>
            {waitlisted.map((p) => (
              <View key={p.id} style={styles.cell}>
                <View style={styles.waitlistAvatarWrap}>
                  <AvatarCircle name={p.name} size={48} />
                </View>
                <Text style={styles.waitlistName}>{firstNameLastInitial(p.name)}</Text>
                {p.nickname ? <Text style={styles.nickname}>{p.nickname}</Text> : null}
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  emptyTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.text, marginTop: spacing[3] },
  emptyHint: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing[1] },
  teamHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] },
  teamTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.text },
  teamSpots: { fontSize: fontSizes.sm, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4], marginBottom: spacing[6] },
  cell: { width: '30%', minWidth: 90, alignItems: 'center' },
  name: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text, marginTop: spacing[1] },
  nameGuest: { color: colors.textMuted, fontWeight: fontWeights.normal },
  cellGuest: { opacity: 0.55 },
  nickname: { fontSize: fontSizes.xs, color: colors.textMuted },
  waitlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  waitlistTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.textMuted },
  waitlistAvatarWrap: { opacity: 0.6 },
  waitlistName: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.textMuted, marginTop: spacing[1] },
});
