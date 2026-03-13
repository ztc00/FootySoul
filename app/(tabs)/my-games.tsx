import { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMyBookings } from '@/hooks/useGames';
import { router } from 'expo-router';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, fontWeights, radius, shadows } from '@/theme';

type BookingItem = { id: string; game: any; status: string; paid_amount: number };
type Section = { title: string; data: BookingItem[] };

function groupBookingsByDate(bookings: BookingItem[]): Section[] {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const map = new Map<string, BookingItem[]>();
  bookings.forEach((item) => {
    const d = startOfDay(new Date(item.game.start_time));
    let key: string;
    if (isSameDay(d, today)) key = 'Today';
    else if (isSameDay(d, tomorrow)) key = 'Tomorrow';
    else key = format(d, 'EEE d MMM');
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  });
  const order = ['Today', 'Tomorrow'];
  const sections: Section[] = [];
  order.forEach((k) => {
    const data = map.get(k);
    if (data?.length) sections.push({ title: k, data });
  });
  Array.from(map.entries())
    .filter(([k]) => !order.includes(k))
    .sort(([, a], [, b]) => new Date(a[0].game.start_time).getTime() - new Date(b[0].game.start_time).getTime())
    .forEach(([, data]) => sections.push({ title: format(new Date(data[0].game.start_time), 'EEE d MMM'), data }));
  return sections;
}

function statusLabel(status: string): string {
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'waitlisted') return 'On Waitlist';
  if (status === 'cancelled') return 'Cancelled';
  return status;
}

export default function MyGamesScreen() {
  const insets = useSafeAreaInsets();
  const { data: bookings = [], isLoading, refetch } = useMyBookings();

  const sections = useMemo(() => groupBookingsByDate(bookings), [bookings]);

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  const renderBooking = ({ item }: { item: BookingItem }) => {
    const game = item.game;
    if (!game) return null;

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => router.push(`/game/${game.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.bookingHeader}>
          <Text style={styles.gameTitle} numberOfLines={1}>{game.title}</Text>
          <View
            style={[
              styles.statusBadge,
              item.status === 'confirmed' && styles.statusConfirmed,
              item.status === 'waitlisted' && styles.statusWaitlisted,
              item.status === 'cancelled' && styles.statusCancelled,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === 'confirmed' && styles.statusTextConfirmed,
                item.status === 'waitlisted' && styles.statusTextWaitlisted,
                item.status === 'cancelled' && styles.statusTextCancelled,
              ]}
            >
              {statusLabel(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.bookingInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              {format(new Date(game.start_time), 'EEE, MMM d · h:mm a')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={1}>{game.location_name}</Text>
          </View>
        </View>
        {item.paid_amount > 0 && (
          <View style={styles.bookingFooter}>
            <Text style={styles.priceText}>{item.paid_amount} {game.currency} paid</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={64} color={colors.border} />
        <Text style={styles.emptyText}>No upcoming games</Text>
        <Text style={styles.emptySubtext}>Book a game to see it here</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => router.push('/(tabs)/home')}
        >
          <Text style={styles.browseButtonText}>Find a game</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderSectionHeader = ({ section, index }: { section: Section; index: number }) => (
    <Text style={[styles.sectionHeader, index > 0 && styles.sectionHeaderNotFirst]}>{section.title}</Text>
  );

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        renderItem={renderBooking}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.list,
          { paddingTop: spacing[2], paddingBottom: insets.bottom + spacing[6] },
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: spacing[4],
  },
  sectionHeader: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  sectionHeaderNotFirst: {
    marginTop: spacing[4],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  gameTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    flexShrink: 0,
  },
  statusConfirmed: { backgroundColor: colors.accentLight },
  statusWaitlisted: { backgroundColor: colors.warningLight },
  statusCancelled: { backgroundColor: colors.dangerLight },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  statusTextConfirmed: { color: colors.accentDark },
  statusTextWaitlisted: { color: '#92400E' },
  statusTextCancelled: { color: colors.danger },
  bookingInfo: {
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  infoText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  bookingFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing[3],
    marginTop: spacing[2],
  },
  priceText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  emptyText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginTop: spacing[4],
  },
  emptySubtext: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing[2],
    marginBottom: spacing[6],
  },
  browseButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
  },
  browseButtonText: {
    color: colors.white,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
});

