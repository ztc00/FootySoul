import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { format, isToday, isTomorrow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows, fontSizes, fontWeights } from '@/theme';
import { Card, PillBadge, Tag, ProgressBar } from '@/components/ui';
import type { Game } from '@/types/database';

type GameCardProps = {
  game: Game;
  spotsFilled: number;
  locked?: boolean;
};

function formatDateLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE, MMM d');
}

export function GameCard({ game, spotsFilled, locked }: GameCardProps) {
  const router = useRouter();
  const start = new Date(game.start_time);
  const filled = Math.min(spotsFilled, game.capacity);
  const pitchType = game.pitch_type || '5-a-side';

  const handlePress = () => router.push(`/game/${game.id}`);

  if (locked) {
    return (
      <Card style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{game.title}</Text>
          <View style={styles.titleRight}>
            <PillBadge label={`${game.price} ${game.currency}`} />
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
              <Text style={styles.lockedText}>Invite only</Text>
            </View>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.location} numberOfLines={1}>{game.location_name}</Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Tag label={pitchType} />
            {game.organizer && <Text style={styles.organizer}>{game.organizer.display_name}</Text>}
          </View>
          <Text style={styles.timeRight}>{format(start, 'h:mm a')}</Text>
        </View>
        <Pressable style={[styles.lockedBtnsRow, styles.lockedBtn]} onPress={handlePress}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.lockedBtnText}>View game</Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <Pressable onPress={handlePress}>
      <Card style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{game.title}</Text>
          <View style={styles.titleRight}>
            <Text style={styles.priceText}>{game.price} {game.currency}</Text>
            <Text style={styles.spots}>{filled}/{game.capacity}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.location} numberOfLines={1}>{game.location_name}</Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Tag label={pitchType} />
            {game.organizer && <Text style={styles.organizer}>{game.organizer.display_name}</Text>}
          </View>
          <Text style={styles.timeRight}>{format(start, 'h:mm a')}</Text>
        </View>
        <ProgressBar value={filled} max={game.capacity} height={4} style={styles.progress} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing[3], paddingVertical: spacing[2], paddingHorizontal: spacing[4] },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[2], marginBottom: spacing[1] },
  title: { fontSize: fontSizes.base, fontWeight: fontWeights.bold, color: colors.text, flex: 1 },
  titleRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexShrink: 0 },
  priceText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.accent },
  spots: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginBottom: spacing[1] },
  location: { fontSize: fontSizes.sm, color: colors.textSecondary, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[1] },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 },
  organizer: { fontSize: fontSizes.xs, color: colors.textMuted },
  timeRight: { fontSize: fontSizes.sm, color: colors.textSecondary },
  progress: { marginTop: spacing[2] },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockedText: { fontSize: fontSizes.xs, color: colors.textMuted },
  lockedBtnsRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2], alignSelf: 'stretch', justifyContent: 'center' },
  lockedBtn: { paddingVertical: spacing[2], paddingHorizontal: spacing[3], backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
  lockedBtnText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text },
});
