import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cancelGame } from '@/lib/stripe';
import { router, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, fontWeights, radius, shadows } from '@/theme';
import type { Game, Organizer, BookingStatus } from '@/types/database';

type DashboardBooking = {
  id: string;
  status: BookingStatus;
  paid_amount: number;
  spots: number;
};

type DashboardGame = Game & {
  bookings: DashboardBooking[];
};

export default function OrganizerDashboardScreen() {
  const { user } = useAuth();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [games, setGames] = useState<DashboardGame[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user || !supabase) {
        setLoading(false);
        return;
      }
      setLoading(true);
      (async () => {
        try {
          // Use SECURITY DEFINER RPC to bypass profiles RLS recursion
          const { data: organizerId } = await supabase.rpc('get_my_organizer_id');
          if (organizerId) {
            const { data: org } = await supabase.from('organizers').select('*').eq('id', organizerId).single();
            if (org) {
              setOrganizer(org);
              const { data: gamesData } = await supabase
                .from('games')
                .select('*, bookings(id, status, paid_amount, spots)')
                .eq('organizer_id', org.id)
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true });
              setGames(gamesData || []);
            }
          }
        } catch (_) {
          // Error loading dashboard
        } finally {
          setLoading(false);
        }
      })();
    }, [user])
  );

  const getMessageTemplate = (type: string, game: DashboardGame) => {
    const confirmedCount = game.bookings?.filter((b) => b.status === 'confirmed').reduce((sum, b) => sum + (b.spots ?? 1), 0) || 0;
    const remaining = game.capacity - confirmedCount;
    switch (type) {
      case 'spots_left':
        return `⚡ ${game.title}\n${remaining} spots left! Join now: ${game.invite_code ? `footysoul://game/${game.id}?code=${game.invite_code}` : `footysoul://game/${game.id}`}`;
      case 'full':
        return `🔴 ${game.title} is FULL!\nWaitlist is open. Join: ${game.invite_code ? `footysoul://game/${game.id}?code=${game.invite_code}` : `footysoul://game/${game.id}`}`;
      case 'reminder':
        return `⏰ Reminder: ${game.title} is tomorrow!\n📅 ${format(new Date(game.start_time), 'MMM d, yyyy • h:mm a')}\n📍 ${game.location_name}\n\nBring your boots! ⚽`;
      default:
        return '';
    }
  };

  const handleCancelGame = (game: DashboardGame) => {
    const confirmedBookings = game.bookings?.filter((b) => b.status === 'confirmed') || [];
    const paidCount = confirmedBookings.filter((b) => b.paid_amount > 0).length;

    Alert.alert(
      'Cancel Game',
      `Are you sure you want to cancel "${game.title}"?${paidCount > 0 ? `\n\n${paidCount} paid booking${paidCount > 1 ? 's' : ''} will be refunded.` : ''}`,
      [
        { text: 'Keep Game', style: 'cancel' },
        {
          text: 'Cancel Game',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelGame(game.id);
              setGames((prev) => prev.filter((g) => g.id !== game.id));
              Alert.alert('Game Cancelled', 'All players have been refunded.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to cancel game. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleShareTemplate = async (type: string, game: DashboardGame) => {
    const message = getMessageTemplate(type, game);
    try {
      await Share.share({ message, title: game.title });
    } catch (_) {
      // Share dismissed or failed
    }
  };

  const renderGame = ({ item }: { item: DashboardGame }) => {
    const confirmedCount = item.bookings?.filter((b) => b.status === 'confirmed').reduce((sum, b) => sum + (b.spots ?? 1), 0) || 0;
    const remaining = item.capacity - confirmedCount;
    const totalRevenue = item.bookings?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0;

    return (
      <View style={styles.gameCard}>
        <View style={styles.gameHeader}>
          <Text style={styles.gameTitle}>{item.title}</Text>
          <TouchableOpacity onPress={() => router.push(`/game/${item.id}`)}>
            <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameDate}>
            {format(new Date(item.start_time), 'MMM d, yyyy • h:mm a')}
          </Text>
          <Text style={styles.gameLocation}>{item.location_name}</Text>
          <Text style={styles.gameStats}>
            {confirmedCount}/{item.capacity} players · {remaining} spots left
          </Text>
          {totalRevenue > 0 && (
            <Text style={styles.gameRevenue}>{totalRevenue} {item.currency} collected</Text>
          )}
        </View>
        <View style={styles.templates}>
          <Text style={styles.templatesTitle}>Share</Text>
          <View style={styles.templateButtons}>
            <TouchableOpacity
              style={styles.templateButton}
              onPress={() => handleShareTemplate('spots_left', item)}
            >
              <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.templateButtonText}>Spots Left</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.templateButton}
              onPress={() => handleShareTemplate('full', item)}
            >
              <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.templateButtonText}>Full</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.templateButton}
              onPress={() => handleShareTemplate('reminder', item)}
            >
              <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.templateButtonText}>Reminder</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelGame(item)}
        >
          <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.cancelButtonText}>Cancel Game</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {organizer && (
        <Text style={styles.orgName}>{organizer.display_name}</Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/create-game')}
        >
          <Ionicons name="add" size={24} color={colors.white} />
          <Text style={styles.createButtonText}>Create Game</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statsButton}
          onPress={() => router.push('/organizer-stats')}
        >
          <Ionicons name="stats-chart-outline" size={20} color={colors.text} />
          <Text style={styles.statsButtonText}>View stats</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Games</Text>
        {games.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="football-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No upcoming games</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/create-game')}
            >
              <Text style={styles.emptyButtonText}>Create your first game</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={games}
            renderItem={renderGame}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing[8] },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  orgName: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  actions: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  createButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: radius.md,
    gap: spacing[2],
  },
  createButtonText: {
    color: colors.white,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsButtonText: {
    color: colors.text,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  section: { paddingHorizontal: spacing[4] },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  gameCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  gameTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    flex: 1,
  },
  gameInfo: { marginBottom: spacing[4] },
  gameDate: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing[1] },
  gameLocation: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing[1] },
  gameStats: { fontSize: fontSizes.sm, color: colors.text, fontWeight: fontWeights.medium, marginTop: spacing[2] },
  gameRevenue: { fontSize: fontSizes.sm, color: colors.accent, fontWeight: fontWeights.semibold, marginTop: spacing[1] },
  templates: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing[3],
  },
  templatesTitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  templateButtons: { flexDirection: 'row', gap: spacing[2] },
  templateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    gap: spacing[1],
  },
  templateButtonText: { fontSize: fontSizes.xs, color: colors.text, fontWeight: fontWeights.medium },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    marginTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cancelButtonText: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    fontWeight: fontWeights.medium,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing[8],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  emptyText: { fontSize: fontSizes.base, color: colors.textSecondary, marginTop: spacing[4] },
  emptyButton: {
    marginTop: spacing[4],
    backgroundColor: colors.accent,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
  },
  emptyButtonText: { color: colors.white, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
});
