import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrganizerStats, type VenueStats } from '@/hooks/useOrganizerStats';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';

function VenueRow({ venue, subtitle }: { venue: VenueStats; subtitle: string }) {
  return (
    <View style={styles.venueRow}>
      <View style={styles.venueInfo}>
        <Text style={styles.venueName} numberOfLines={1}>{venue.venueName}</Text>
        <Text style={styles.venueSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

export default function OrganizerStatsScreen() {
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading } = useOrganizerStats();

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const s = stats!;

  if (s.totalGames === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="stats-chart-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No stats yet</Text>
        <Text style={styles.muted}>Create and run games to see insights here</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8] }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.overviewGrid}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{s.totalGames}</Text>
            <Text style={styles.overviewLabel}>Games organized</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{s.gamesThisMonth}</Text>
            <Text style={styles.overviewLabel}>This month</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{s.totalRevenue}</Text>
            <Text style={styles.overviewLabel}>Total revenue (AED)</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your rating</Text>
        <View style={styles.ratingCard}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={28} color={colors.warning} />
            <Text style={styles.ratingValue}>{s.organizerRating > 0 ? s.organizerRating.toFixed(1) : '—'}</Text>
            <Text style={styles.ratingCount}>({s.ratingCount} review{s.ratingCount !== 1 ? 's' : ''})</Text>
          </View>
          {s.ratingCount > 0 && (
            <Text style={styles.playAgain}>Would play again: {s.playAgainPct}%</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Venue insights</Text>

        {s.topVenueByBookings && (
          <View style={styles.insightBlock}>
            <Text style={styles.insightLabel}>Most booked</Text>
            <VenueRow
              venue={s.topVenueByBookings}
              subtitle={`${s.topVenueByBookings.gameCount} game${s.topVenueByBookings.gameCount !== 1 ? 's' : ''}`}
            />
          </View>
        )}

        {s.topVenueByRevenue && s.topVenueByRevenue.totalRevenue > 0 && (
          <View style={styles.insightBlock}>
            <Text style={styles.insightLabel}>Most profit</Text>
            <VenueRow
              venue={s.topVenueByRevenue}
              subtitle={`${s.topVenueByRevenue.totalRevenue} AED total`}
            />
          </View>
        )}

        {s.topVenueByRating && s.topVenueByRating.ratingCount >= 1 && (
          <View style={styles.insightBlock}>
            <Text style={styles.insightLabel}>Highest rated</Text>
            <VenueRow
              venue={s.topVenueByRating}
              subtitle={`${s.topVenueByRating.avgRating.toFixed(1)} ★ (${s.topVenueByRating.ratingCount} review${s.topVenueByRating.ratingCount !== 1 ? 's' : ''})`}
            />
          </View>
        )}
      </View>

      {s.venues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All venues</Text>
          <View style={styles.card}>
            {s.venues.map((v, i) => (
              <View
                key={`${v.venueName}-${i}`}
                style={[styles.venueRow, i < s.venues.length - 1 && styles.venueRowBorder]}
              >
                <View style={styles.venueInfo}>
                  <Text style={styles.venueName} numberOfLines={1}>{v.venueName}</Text>
                  <Text style={styles.venueSub}>
                    {v.gameCount} game{v.gameCount !== 1 ? 's' : ''} · {v.totalRevenue} AED
                    {v.ratingCount > 0 ? ` · ${v.avgRating.toFixed(1)} ★` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.hint}>Insights are based on your past and upcoming games.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], paddingTop: spacing[6] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  muted: { fontSize: fontSizes.sm, color: colors.textMuted },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text, marginTop: spacing[4] },
  section: { marginBottom: spacing[8] },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  overviewCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  overviewValue: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, color: colors.text },
  overviewLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: spacing[1] },
  ratingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  ratingValue: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, color: colors.text },
  ratingCount: { fontSize: fontSizes.sm, color: colors.textMuted },
  playAgain: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing[2] },
  insightBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  insightLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  venueRow: { padding: spacing[4] },
  venueRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  venueInfo: { flex: 1 },
  venueName: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.text },
  venueSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing[1] },
  hint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
});
