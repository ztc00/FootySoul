import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Linking,
  Platform,
  Image,
} from 'react-native';
import Constants from 'expo-constants';
import { useGame } from '@/hooks/useGames';
import { useFavoriteVenues } from '@/hooks/useFavoriteVenues';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { createPaymentIntent, confirmPayment, refundBooking } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors, spacing, radius, fontSizes, fontWeights } from '@/theme';
import { PrimaryButton, Tag, AvatarCircle, useToast } from '@/components/ui';

const HEADER_ASPECT = 21 / 9;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = Math.round(SCREEN_WIDTH / HEADER_ASPECT);
const CARD_TOP_RADIUS = 20;

function firstNameLastInitial(name: string | null | undefined): string {
  if (!name || !name.trim()) return 'Player';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  return parts[0];
}

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: game, isLoading } = useGame(id ?? '');
  const { user } = useAuth();
  const stripe = useStripe();
  const queryClient = useQueryClient();
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [myBooking, setMyBooking] = useState<{ id: string; status: string; paid_amount: number; spots: number; stripe_payment_intent_id: string | null } | null>(null);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const { showToast, Toast } = useToast();
  const [remainingCapacity, setRemainingCapacity] = useState(0);
  const [spotsTaken, setSpotsTaken] = useState(0);
  const [attendees, setAttendees] = useState<{ id: string; name: string | null; isGuest?: boolean }[]>([]);
  const [waitlistedPlayers, setWaitlistedPlayers] = useState<{ id: string; name: string | null }[]>([]);
  const [joinSpots, setJoinSpots] = useState(1);
  const { isFavorite, addFavorite, removeFavorite } = useFavoriteVenues();

  const stripeKey =
    Constants.expoConfig?.extra?.stripePublishableKey ||
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    '';
  const isStripeConfigured = !!stripeKey;
  const payNow = game?.require_payment_now !== false;

  // ── Fetch booking details (attendees, spots, waitlist) ──────
  const refreshBookingDetails = useCallback(async () => {
    if (!game?.id || !supabase) return;
    const { data: rows } = await supabase
      .rpc('get_game_booking_details', { p_game_id: game.id });

    const confirmed = (rows ?? []).filter((b: { status: string }) => b.status === 'confirmed');
    const waitlisted = (rows ?? []).filter((b: { status: string }) => b.status === 'waitlisted');

    const totalSpots = confirmed.reduce((s: number, b: { spots?: number }) => s + (b.spots ?? 1), 0);
    setSpotsTaken(totalSpots);
    setRemainingCapacity(Math.max(0, game.capacity - totalSpots));

    // Expand bookings with spots > 1 into Guest entries so avatars match the spots count
    const expandedAttendees: { id: string; name: string | null; isGuest?: boolean }[] = [];
    for (const b of confirmed as { player_id: string; player_name: string; spots?: number }[]) {
      expandedAttendees.push({ id: b.player_id, name: b.player_name });
      for (let i = 1; i < (b.spots ?? 1); i++) {
        expandedAttendees.push({ id: `${b.player_id}-guest-${i}`, name: null, isGuest: true });
      }
    }
    setAttendees(expandedAttendees);
    setWaitlistedPlayers(waitlisted.map((b: { player_id: string; player_name: string }) => ({ id: b.player_id, name: b.player_name })));
  }, [game?.id, game?.capacity]);

  // Initial fetch
  useEffect(() => {
    refreshBookingDetails();
  }, [refreshBookingDetails]);

  // ── Real-time: live-update when any booking changes for this game ──
  useEffect(() => {
    if (!game?.id || !supabase) return;
    const channel = supabase
      .channel(`game-bookings-${game.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `game_id=eq.${game.id}` },
        () => {
          // Another player joined/cancelled — refresh attendee list
          refreshBookingDetails();
          queryClient.invalidateQueries({ queryKey: ['bookingCounts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, refreshBookingDetails, queryClient]);

  // Fetch current user's profile and their booking for this game
  useEffect(() => {
    if (!game?.id || !user || !supabase) return;
    let cancelled = false;
    (async () => {
      // ensure_my_profile: auto-creates profile if missing
      const { data: profileId } = await supabase.rpc('ensure_my_profile');
      if (cancelled || !profileId) return;
      setMyProfileId(profileId as string);
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, status, paid_amount, spots, stripe_payment_intent_id')
        .eq('game_id', game.id)
        .eq('player_id', profileId)
        .neq('status', 'cancelled')
        .maybeSingle();
      if (!cancelled) setMyBooking(booking ?? null);
    })();
    return () => { cancelled = true; };
  }, [game?.id, user]);

  const handleCancel = async () => {
    if (!myBooking || !game) return;
    const hoursUntilGame = (new Date(game.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
    const canRefund = hoursUntilGame >= 24 && (myBooking.paid_amount ?? 0) > 0 && !!myBooking.stripe_payment_intent_id;
    const isWaitlisted = myBooking.status === 'waitlisted';

    Alert.alert(
      isWaitlisted ? 'Leave waitlist?' : 'Cancel booking?',
      isWaitlisted
        ? 'You\'ll lose your waitlist spot.'
        : canRefund
          ? 'You\'ll receive a full refund within a few days.'
          : hoursUntilGame < 24
            ? 'The game starts in less than 24 hours — no refund is available.'
            : 'This booking was free, no charge to cancel.',
      [
        { text: 'Keep my spot', style: 'cancel' },
        {
          text: isWaitlisted ? 'Leave waitlist' : 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              if (myBooking.stripe_payment_intent_id) {
                await refundBooking(myBooking.id);
              } else {
                await supabase!.from('bookings').update({ status: 'cancelled' }).eq('id', myBooking.id);
              }
              setMyBooking(null);
              if (myBooking.status === 'confirmed') {
                const spots = myBooking.spots ?? 1;
                setRemainingCapacity((c) => c + spots);
                setSpotsTaken((s) => Math.max(0, s - spots));
                if (myProfileId) setAttendees((prev) => prev.filter((a) => a.id !== myProfileId));
              } else if (myBooking.status === 'waitlisted') {
                if (myProfileId) setWaitlistedPlayers((prev) => prev.filter((a) => a.id !== myProfileId));
              }
              queryClient.invalidateQueries({ queryKey: ['game', id] });
              queryClient.invalidateQueries({ queryKey: ['bookings'] });
              queryClient.invalidateQueries({ queryKey: ['bookingCounts'] });
              showToast(
                isWaitlisted
                  ? 'Removed from waitlist'
                  : canRefund
                    ? 'Cancelled — refund on the way'
                    : 'Booking cancelled'
              );
            } catch (e: unknown) {
              showToast((e as Error).message || 'Could not cancel', 'error');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleJoin = async () => {
    if (!game || !user) return;

    if (new Date(game.start_time) < new Date()) {
      Alert.alert('Game Started', 'This game has already started and is no longer accepting bookings.');
      return;
    }

    // ensure_my_profile: auto-creates the profile row if it doesn't exist
    const { data: profileId, error: pidErr } = await supabase!.rpc('ensure_my_profile');
    if (pidErr || !profileId) {
      Alert.alert('Error', pidErr?.message || 'Could not load profile. Try signing out and back in.');
      return;
    }
    // Get display name — fall back to auth metadata
    const { data: myProfileRows } = await supabase!.rpc('get_my_profile');
    const row = (myProfileRows as { name?: string | null }[] | null)?.[0];
    const profileName = row?.name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null;
    const profile = { id: profileId as string, name: profileName };
    const { data: existingBooking } = await supabase!
      .from('bookings')
      .select('id')
      .eq('game_id', game.id)
      .eq('player_id', profile.id)
      .single();
    if (existingBooking) {
      Alert.alert('Already Booked', 'You have already joined this game.');
      return;
    }
    const spotsToBook = Math.min(3, Math.max(1, joinSpots));

    // ── Waitlist flow ──────────────────────────────────────────────
    if (isFull) {
      setJoining(true);
      try {
        await supabase!.from('bookings').insert({
          game_id: game.id,
          player_id: profile.id,
          spots: 1,
          status: 'waitlisted',
          paid_amount: 0,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMyBooking({ id: 'temp', status: 'waitlisted', paid_amount: 0, spots: 1, stripe_payment_intent_id: null });
        setWaitlistedPlayers((prev) => [
          ...prev,
          { id: profile!.id, name: profile!.name ?? user.user_metadata?.full_name ?? user.email ?? 'You' },
        ]);
        queryClient.invalidateQueries({ queryKey: ['game', id] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        showToast("You're on the waitlist! We'll notify you if a spot opens.");
      } catch (error: unknown) {
        showToast((error as Error).message || 'Failed to join waitlist', 'error');
      } finally {
        setJoining(false);
      }
      return;
    }

    // ── Not enough spots ───────────────────────────────────────────
    if (remainingCapacity < spotsToBook) {
      Alert.alert('Not enough spots', `Only ${remainingCapacity} spot(s) left.`);
      return;
    }

    if (payNow && !isStripeConfigured) {
      Alert.alert(
        'Payments not set up',
        'Add your Stripe keys to enable joining with payment. See STRIPE_SETUP.md for instructions.'
      );
      return;
    }

    // ── Normal join flow ───────────────────────────────────────────
    setJoining(true);
    try {
      if (payNow && isStripeConfigured) {
        const clientSecret = await createPaymentIntent(game.id, spotsToBook);
        const { error: initError } = await stripe!.initPaymentSheet({
          merchantDisplayName: 'FootySoul',
          paymentIntentClientSecret: clientSecret,
          defaultBillingDetails: { name: user.email || 'Player' },
          allowsDelayedPaymentMethods: false,
          applePay: { merchantCountryCode: 'AE' },
        });
        if (initError) throw initError;
        const { error: presentError } = await stripe!.presentPaymentSheet();
        if (presentError) {
          if (presentError.code !== 'Canceled') throw presentError;
          return;
        }
        const paymentIntentId = clientSecret.split('_secret_')[0];
        setPaymentProcessing(true);
        try {
          await confirmPayment(paymentIntentId);
        } finally {
          setPaymentProcessing(false);
        }
      } else {
        await supabase!.from('bookings').insert({
          game_id: game.id,
          player_id: profile.id,
          spots: spotsToBook,
          status: 'confirmed',
          paid_amount: 0,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRemainingCapacity((c) => Math.max(0, c - spotsToBook));
      setSpotsTaken((s) => s + spotsToBook);
      setAttendees((prev) => {
        const already = prev.some((a) => a.id === profile!.id);
        if (already) return prev;
        return [...prev, { id: profile!.id, name: profile!.name ?? user.user_metadata?.full_name ?? user.email ?? 'You' }];
      });
      queryClient.invalidateQueries({ queryKey: ['game', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookingCounts'] });
      showToast(`You're in! See you on the pitch ⚽`);
    } catch (error: unknown) {
      showToast((error as Error).message || 'Failed to join game', 'error');
    } finally {
      setJoining(false);
    }
  };

  const handleShare = async () => {
    if (!game) return;
    const inviteLink = game.invite_code
      ? `footysoul://game/${game.id}?code=${game.invite_code}`
      : `footysoul://game/${game.id}`;
    const message = `Join ${game.title} on ${format(new Date(game.start_time), 'MMM d, yyyy')} at ${game.location_name}. ${inviteLink}`;
    try {
      await Share.share({ message, title: game.title });
    } catch (_) {
      // Share dismissed or failed
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  if (!game) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Game not found</Text>
      </View>
    );
  }

  const isFull = remainingCapacity <= 0;
  const pitchType = game.pitch_type || '5-a-side';
  const MAX_AVATARS = 6;
  const shownAvatars = attendees.slice(0, MAX_AVATARS);
  const overflowCount = attendees.length > MAX_AVATARS ? attendees.length - MAX_AVATARS : 0;
  const namedAttendees = attendees.filter((a) => !a.isGuest);
  const firstThreeNamed = namedAttendees.slice(0, 3);
  const andMore = attendees.length > firstThreeNamed.length ? attendees.length - firstThreeNamed.length : 0;
  const namesLine = firstThreeNamed.length === 0 ? '' : firstThreeNamed.map((a) => firstNameLastInitial(a.name)).join(', ') + (andMore > 0 ? ` and ${andMore} more are attending` : ' are attending');

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Image header – share only (back is in nav header) */}
        <View style={styles.headerImageWrap}>
          {game.image_url ? (
            <Image source={{ uri: game.image_url }} style={styles.headerImage} resizeMode="cover" />
          ) : (
            <View style={[styles.headerPlaceholder, styles.headerGradient]}>
              <Text style={styles.headerPlaceholderText} numberOfLines={2}>{game.location_name}</Text>
            </View>
          )}
          <SafeAreaView style={styles.headerOverlay} pointerEvents="box-none">
            <View style={styles.headerBtnPlaceholder} />
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleShare}
              accessibilityLabel="Share game"
              accessibilityRole="button"
            >
              <Ionicons name="share-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Single white content card (reference style) */}
        <View style={styles.card}>
          <View style={styles.tagsRow}>
            <Tag label={pitchType} />
            <Tag label={game.visibility === 'invite_only' ? 'Invite only' : 'Public'} />
          </View>
          <Text style={styles.title}>{game.title}</Text>
          {game.organizer && (
            <Text style={styles.organiser}>Organised by {game.organizer.display_name}</Text>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.infoValue}>
              {format(new Date(game.start_time), 'EEE, MMM d · ha')} – {format(new Date(game.end_time), 'ha')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() =>
              router.push({
                pathname: '/venue-games',
                params: {
                  location_name: game.location_name,
                  ...(game.place_id ? { place_id: game.place_id } : {}),
                },
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.infoValue}>{game.location_name}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.locationActions}>
            <Text style={styles.infoSub}>{game.address}</Text>
            <TouchableOpacity
              onPress={async () => {
                const fav = isFavorite(game.place_id ?? null, game.location_name);
                try {
                  if (fav) await removeFavorite({ place_id: game.place_id ?? null, location_name: game.location_name });
                  else await addFavorite({ place_id: game.place_id ?? null, location_name: game.location_name });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (e) {
                  Alert.alert('Error', (e as Error).message);
                }
              }}
              accessibilityLabel={isFavorite(game.place_id ?? null, game.location_name) ? 'Remove from saved venues' : 'Save venue'}
              accessibilityRole="button"
              style={styles.favBtn}
            >
              <Ionicons
                name={isFavorite(game.place_id ?? null, game.location_name) ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite(game.place_id ?? null, game.location_name) ? colors.accent : colors.textMuted}
              />
              <Text style={styles.favLabel}>{isFavorite(game.place_id ?? null, game.location_name) ? 'Saved' : 'Save venue'}</Text>
            </TouchableOpacity>
          </View>

          {typeof game.latitude === 'number' && typeof game.longitude === 'number' && (
            <View style={styles.mapWrap}>
              <MapView
                style={styles.smallMap}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: game.latitude,
                  longitude: game.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker coordinate={{ latitude: game.latitude, longitude: game.longitude }} title={game.location_name} />
              </MapView>
            </View>
          )}
          <TouchableOpacity
            style={styles.openMapsBtn}
            onPress={() => {
              // Use lat/lng if available (more accurate), otherwise fall back to text query
              const url =
                typeof game.latitude === 'number' && typeof game.longitude === 'number'
                  ? `https://www.google.com/maps/search/?api=1&query=${game.latitude},${game.longitude}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([game.location_name, game.address].filter(Boolean).join(', '))}`;
              Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open maps'));
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={20} color={colors.accent} />
            <Text style={styles.openMapsText}>Open in Maps</Text>
          </TouchableOpacity>

          <View style={styles.threeCol}>
            <View style={styles.threeColItem}>
              <Text style={styles.threeColLabel}>Price</Text>
              <Text style={styles.threeColValue}>{game.price} {game.currency}</Text>
            </View>
            <View style={styles.threeColItem}>
              <Text style={styles.threeColLabel}>Pitch</Text>
              <Text style={styles.threeColValue}>{pitchType}</Text>
            </View>
            <View style={styles.threeColItem}>
              <Text style={styles.threeColLabel}>Type</Text>
              <Text style={styles.threeColValue}>{game.visibility === 'invite_only' ? 'Invite only' : 'Public'}</Text>
            </View>
          </View>

          <View style={styles.refundBanner}>
            <Ionicons name="information-circle" size={20} color={colors.white} />
            <Text style={styles.refundText}>
              Free cancellation up to 24 hours before the game. If the organiser cancels, you always get a full refund.
            </Text>
          </View>

          <View style={styles.attendingSection}>
            <Text style={styles.attendingTitle}>{spotsTaken} spots taken · {remainingCapacity} left</Text>
            <View style={styles.attendingRow}>
              <View style={styles.avatarRow}>
                {shownAvatars.map((a) => (
                  <View key={a.id} style={styles.avatarWrap}>
                    <AvatarCircle name={a.isGuest ? null : a.name} size={36} />
                  </View>
                ))}
                {overflowCount > 0 && (
                  <View style={[styles.avatarWrap, styles.avatarOverflow]}>
                    <Text style={styles.avatarOverflowText}>+{overflowCount}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.rosterChip} onPress={() => router.push(`/game/${id}/roster`)} activeOpacity={0.7}>
                <Ionicons name="people" size={22} color={colors.textSecondary} />
                <Text style={styles.rosterChipLabel}>See all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chatChip} onPress={() => router.push(`/game/${id}/chat`)} activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.chatChipLabel}>Chat</Text>
              </TouchableOpacity>
            </View>
            {spotsTaken > 0 && (
              <Text style={styles.attendingNames}>{namesLine}</Text>
            )}
          </View>

          {waitlistedPlayers.length > 0 && (
            <View style={styles.waitlistSection}>
              <Text style={styles.waitlistTitle}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />{' '}
                {waitlistedPlayers.length} on waitlist
              </Text>
              <View style={styles.waitlistRow}>
                {waitlistedPlayers.slice(0, 5).map((w) => (
                  <View key={w.id} style={styles.avatarWrap}>
                    <AvatarCircle name={w.name} size={30} />
                  </View>
                ))}
                {waitlistedPlayers.length > 5 && (
                  <Text style={styles.waitlistMore}>+{waitlistedPlayers.length - 5}</Text>
                )}
              </View>
            </View>
          )}

          {game.end_time && new Date(game.end_time) < new Date() && (
            <TouchableOpacity style={styles.rateLink} onPress={() => router.push(`/game/${id}/feedback`)}>
              <Ionicons name="star-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.rateLinkText}>Rate this game</Text>
            </TouchableOpacity>
          )}

          {game.rules && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Important information</Text>
              <Text style={styles.rulesText}>{game.rules}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {paymentProcessing && (
        <View style={styles.paymentOverlay}>
          <View style={styles.paymentOverlayCard}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.paymentOverlayTitle}>Confirming your spot…</Text>
            <Text style={styles.paymentOverlayText}>Please don&apos;t close the app.</Text>
          </View>
        </View>
      )}

      <View style={[styles.joinBar, { paddingBottom: Math.max(insets.bottom, spacing[3]) }]}>
        {myBooking ? (
          /* ── User already has a booking ── */
          <View style={styles.bookingStatusRow}>
            <View style={styles.bookingStatusLeft}>
              {myBooking.status === 'confirmed' ? (
                <>
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    <Text style={styles.statusBadgeText}>You're in!</Text>
                  </View>
                  <Text style={styles.statusSubtext}>
                    {(new Date(game.start_time).getTime() - Date.now()) / 3600000 >= 24
                      ? 'Free cancellation available'
                      : 'Less than 24h to go — no refund'}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.statusBadge}>
                    <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                    <Text style={[styles.statusBadgeText, { color: colors.textSecondary }]}>Waitlisted</Text>
                  </View>
                  <Text style={styles.statusSubtext}>You'll be notified if a spot opens up</Text>
                </>
              )}
            </View>
            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Text style={styles.cancelBtnText}>
                  {myBooking.status === 'waitlisted' ? 'Leave' : 'Cancel'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ── No booking yet — show join UI ── */
          <View style={styles.joinRow}>
            <View style={styles.joinButtonWrap}>
              <PrimaryButton
                title={
                  isFull
                    ? 'Join waitlist'
                    : payNow
                      ? `Join · ${joinSpots > 1 ? `${game.price * joinSpots} ${game.currency}` : `${game.price} ${game.currency}`}`
                      : 'Join (pay later)'
                }
                onPress={handleJoin}
                loading={joining}
                disabled={joining}
              />
            </View>
            {!isFull && (
              <View style={styles.spotsSelector}>
                <Text style={styles.spotsLabel}>Spots</Text>
                <View style={styles.spotsRow}>
                  {[1, 2, 3].map((n) => {
                    const canSelect = n <= remainingCapacity;
                    const selected = joinSpots === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.spotChip,
                          selected && styles.spotChipSelected,
                          !canSelect && styles.spotChipDisabled,
                        ]}
                        onPress={() => canSelect && setJoinSpots(n)}
                        disabled={!canSelect}
                      >
                        <Text style={[styles.spotChipText, selected && styles.spotChipTextSelected, !canSelect && styles.spotChipTextDisabled]}>
                          {n}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceMuted },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { fontSize: fontSizes.sm, color: colors.textMuted },
  headerImageWrap: {
    width: '100%',
    height: HEADER_HEIGHT,
    backgroundColor: colors.surfaceMuted,
    borderBottomLeftRadius: CARD_TOP_RADIUS,
    borderBottomRightRadius: CARD_TOP_RADIUS,
    overflow: 'hidden',
  },
  headerImage: { width: '100%', height: '100%' },
  headerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  headerGradient: { backgroundColor: colors.borderLight },
  headerPlaceholderText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
    paddingTop: spacing[1],
  },
  headerBtnPlaceholder: { width: 40, height: 40 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    marginTop: -CARD_TOP_RADIUS,
    borderTopLeftRadius: CARD_TOP_RADIUS,
    borderTopRightRadius: CARD_TOP_RADIUS,
    padding: spacing[4],
    paddingBottom: spacing[8],
    minHeight: 400,
  },
  tagsRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[2] },
  title: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, color: colors.text, marginBottom: spacing[1] },
  organiser: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing[3] },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] },
  infoValue: { fontSize: fontSizes.base, color: colors.text, flex: 1 },
  infoSub: { fontSize: fontSizes.sm, color: colors.textMuted, marginLeft: 26 },
  locationActions: { marginLeft: 26, marginBottom: spacing[3] },
  favBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[2] },
  favLabel: { fontSize: fontSizes.sm, color: colors.textMuted },
  mapWrap: { height: 160, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing[2], backgroundColor: colors.borderLight },
  smallMap: { width: '100%', height: '100%' },
  openMapsBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4], paddingVertical: spacing[2] },
  openMapsText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.accent },
  threeCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  threeColItem: { alignItems: 'center', flex: 1 },
  threeColLabel: { fontSize: fontSizes.xs, color: colors.textMuted, marginBottom: 2 },
  threeColValue: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text },
  refundBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info,
    padding: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  refundText: { flex: 1, fontSize: fontSizes.sm, color: colors.white, lineHeight: 20 },
  attendingSection: { marginBottom: spacing[4] },
  attendingTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing[2] },
  attendingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[1] },
  avatarRow: { flexDirection: 'row', flex: 1, flexWrap: 'wrap' },
  avatarWrap: { marginRight: -8 },
  avatarOverflow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverflowText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.textSecondary },
  rosterChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    marginLeft: spacing[2],
  },
  rosterChipLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  chatChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    marginLeft: spacing[2],
  },
  chatChipLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  attendingNames: { fontSize: fontSizes.sm, color: colors.textSecondary },
  waitlistSection: {
    marginBottom: spacing[4],
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  waitlistTitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: fontWeights.medium,
    marginBottom: spacing[2],
  },
  waitlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waitlistMore: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginLeft: spacing[2],
  },
  rateLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[4],
    paddingVertical: spacing[2],
  },
  rateLinkText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  joinBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  bookingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  bookingStatusLeft: { flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginBottom: 2 },
  statusBadgeText: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.accent },
  statusSubtext: { fontSize: fontSizes.xs, color: colors.textMuted },
  cancelBtn: {
    paddingVertical: spacing[2] + 2,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    minWidth: 70,
    alignItems: 'center',
  },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelBtnText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.danger },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  joinButtonWrap: { flex: 1 },
  spotsSelector: {
    alignItems: 'center',
    minWidth: 72,
  },
  spotsLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing[1],
  },
  spotsRow: { flexDirection: 'row', gap: spacing[1] },
  spotChip: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotChipSelected: {
    backgroundColor: colors.accent,
  },
  spotChipDisabled: {
    opacity: 0.4,
  },
  spotChipText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  spotChipTextSelected: {
    color: colors.white,
  },
  spotChipTextDisabled: {
    color: colors.textMuted,
  },
  paymentOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  paymentOverlayCard: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  paymentOverlayTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  paymentOverlayText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: { marginBottom: spacing[4] },
  sectionTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textMuted, marginBottom: spacing[2], textTransform: 'uppercase' },
  rulesText: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 24 },
});
