import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading } = usePlayerStats();

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Loading stats...</Text>
      </View>
    );
  }

  const s = stats ?? { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, goals: 0, assists: 0, motm: 0 };
  const totalResults = s.wins + s.losses + s.draws;
  const winRate = totalResults > 0 ? Math.round((s.wins / totalResults) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8] }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.overviewRow}>
          <View style={styles.bigStat}>
            <Text style={styles.bigStatValue}>{s.gamesPlayed}</Text>
            <Text style={styles.bigStatLabel}>Games Played</Text>
          </View>
          <View style={styles.bigStat}>
            <Text style={styles.bigStatValue}>{winRate}%</Text>
            <Text style={styles.bigStatLabel}>Win Rate</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Results</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, styles.statWin]}>
            <Text style={styles.statValue}>{s.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={[styles.statBox, styles.statLoss]}>
            <Text style={styles.statValue}>{s.losses}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={[styles.statBox, styles.statDraw]}>
            <Text style={styles.statValue}>{s.draws}</Text>
            <Text style={styles.statLabel}>Draws</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contributions</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, styles.statGoal]}>
            <Text style={styles.statValue}>{s.goals}</Text>
            <Text style={styles.statLabel}>Goals</Text>
          </View>
          <View style={[styles.statBox, styles.statAssist]}>
            <Text style={styles.statValue}>{s.assists}</Text>
            <Text style={styles.statLabel}>Assists</Text>
          </View>
          <View style={[styles.statBox, styles.statMotm]}>
            <Text style={styles.statValue}>{s.motm}</Text>
            <Text style={styles.statLabel}>MOTM</Text>
          </View>
        </View>
      </View>

      <Text style={styles.hint}>
        Result and contribution stats are recorded by organizers after each game.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], paddingTop: spacing[6] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  muted: { fontSize: fontSizes.sm, color: colors.textMuted },
  section: { marginBottom: spacing[8] },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  overviewRow: { flexDirection: 'row', gap: spacing[4] },
  bigStat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[6],
    alignItems: 'center',
  },
  bigStatValue: { fontSize: fontSizes['3xl'], fontWeight: fontWeights.bold, color: colors.text },
  bigStatLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing[1] },
  statsGrid: { flexDirection: 'row', gap: spacing[3] },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    alignItems: 'center',
  },
  statValue: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, color: colors.text },
  statLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: spacing[1] },
  statWin: { borderLeftWidth: 4, borderLeftColor: colors.accent },
  statLoss: { borderLeftWidth: 4, borderLeftColor: colors.danger },
  statDraw: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  statGoal: { borderLeftWidth: 4, borderLeftColor: colors.accent },
  statAssist: { borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  statMotm: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  hint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
});
