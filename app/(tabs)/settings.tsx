import { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';
import { StatCard, AvatarCircle, PressableScale } from '@/components/ui';
import { useFavoriteVenues } from '@/hooks/useFavoriteVenues';
import { usePlayerStats } from '@/hooks/usePlayerStats';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { data: favoriteVenuesList } = useFavoriteVenues();
  const { data: playerStats } = usePlayerStats();
  const [profile, setProfile] = useState<{ name?: string; phone?: string; role?: string } | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user || !supabase) { setProfileLoading(false); return; }
    try {
      // ensure_my_profile: auto-creates the profile row if it doesn't exist
      const { data: profileId } = await supabase.rpc('ensure_my_profile');

      // Fetch profile data + games played in parallel
      const [profileRes, countRes] = await Promise.all([
        supabase.rpc('get_my_profile'),
        profileId
          ? supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('player_id', profileId).eq('status', 'confirmed')
          : Promise.resolve({ count: 0 }),
      ]);

      const row = (profileRes.data as { name?: string; phone?: string; role?: string }[] | null)?.[0];
      if (row) {
        setProfile({ name: row.name, phone: row.phone, role: row.role });
      } else {
        setProfile({ name: null, phone: '', role: 'player' });
      }
      setGamesPlayed((countRes as { count: number | null }).count ?? 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Network') || msg.includes('fetch')) {
        setProfile({ name: null, phone: '', role: 'player' });
        return;
      }
      // Don't crash — show defaults
      setProfile({ name: null, phone: '', role: 'player' });
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleBecomeOrganizer = async () => {
    if (!user || !profile) return;
    if (profile.role === 'organizer') {
      router.push('/organizer-dashboard');
      return;
    }
    if (!supabase) return;
    Alert.alert(
      'Become an Organizer',
      'You will be able to create and manage games.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Single SECURITY DEFINER RPC — bypasses all RLS, handles profile
              // update + organizer upsert atomically in one server-side call.
              const { error } = await supabase.rpc('become_organizer');
              if (error) throw error;

              setProfile((p) => (p ? { ...p, role: 'organizer' } : p));
              Alert.alert('Success', 'You are now an organizer!');
            } catch (error: unknown) {
              Alert.alert('Error', (error as Error).message || 'Failed to become organizer');
            }
          },
        },
      ]
    );
  };

  const displayName = profile?.name?.trim() || user?.email?.split('@')[0] || 'Player';
  const savedVenuesCount = favoriteVenuesList?.length ?? 0;

  if (profileLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: spacing[2], paddingBottom: insets.bottom + spacing[8] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile hero */}
      <View style={styles.hero}>
        <AvatarCircle name={profile?.name} size={72} />
        <Text style={styles.heroName}>{displayName}</Text>
        <Text style={styles.heroSub}>
          {gamesPlayed === 0 && 'Join your first game'}
          {gamesPlayed === 1 && '1 game played'}
          {gamesPlayed > 1 && `${gamesPlayed} games played`}
          {savedVenuesCount > 0 && ` · ${savedVenuesCount} saved venue${savedVenuesCount !== 1 ? 's' : ''}`}
        </Text>
        <PressableScale style={styles.editProfileBtn} onPress={() => router.push('/edit-profile')}>
          <Ionicons name="pencil-outline" size={18} color={colors.white} />
          <Text style={styles.editProfileBtnText}>Edit profile</Text>
        </PressableScale>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your stats</Text>
        <View style={styles.statsRow}>
          <StatCard label="Games Played" value={gamesPlayed} />
          <StatCard label="MOTM" value={playerStats?.motm ?? 0} />
          <StatCard label="Wins" value={playerStats?.wins ?? 0} />
        </View>
        <PressableScale style={styles.viewAllStats} onPress={() => router.push('/stats')}>
          <Text style={styles.viewAllStatsText}>View all stats</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </PressableScale>
      </View>

      {/* Replays */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.card}>
          <PressableScale style={[styles.menuItem, styles.menuItemLast]} onPress={() => router.push('/replays')}>
            <View style={styles.menuIconWrap}>
              <Ionicons name="videocam-outline" size={22} color={colors.textSecondary} />
            </View>
            <Text style={styles.menuText}>View my replays</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </PressableScale>
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          {profile?.role !== 'organizer' && (
            <PressableScale style={styles.menuItem} onPress={handleBecomeOrganizer}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="person-add-outline" size={22} color={colors.accent} />
              </View>
              <Text style={styles.menuText}>Become an Organizer</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </PressableScale>
          )}
          {profile?.role === 'organizer' && (
            <>
              <PressableScale style={styles.menuItem} onPress={() => router.push('/organizer-dashboard')}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name="grid-outline" size={22} color={colors.accent} />
                </View>
                <Text style={styles.menuText}>Organizer Dashboard</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </PressableScale>
              <PressableScale style={styles.menuItem} onPress={() => router.push('/organizer-stats')}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name="stats-chart-outline" size={22} color={colors.accent} />
                </View>
                <Text style={styles.menuText}>Organizer Stats</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </PressableScale>
            </>
          )}
          <PressableScale style={[styles.menuItem, styles.menuItemLast]} onPress={handleSignOut}>
            <View style={[styles.menuIconWrap, styles.menuIconDanger]}>
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
            </View>
            <Text style={[styles.menuText, styles.dangerText]}>Sign Out</Text>
          </PressableScale>
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <PressableScale
            style={styles.menuItem}
            onPress={() => router.push('/support')}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name="help-circle-outline" size={22} color={colors.textSecondary} />
            </View>
            <Text style={styles.menuText}>Help & FAQ</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </PressableScale>
          <PressableScale
            style={styles.menuItem}
            onPress={() => Linking.openURL('mailto:support@footysoul.com').catch(() => Alert.alert('Contact Support', 'support@footysoul.com'))}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name="mail-outline" size={22} color={colors.textSecondary} />
            </View>
            <Text style={styles.menuText}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </PressableScale>
          <PressableScale
            style={styles.menuItem}
            onPress={() => router.push('/privacy-policy')}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name="document-text-outline" size={22} color={colors.textSecondary} />
            </View>
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </PressableScale>
          <PressableScale
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => router.push('/terms')}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name="document-outline" size={22} color={colors.textSecondary} />
            </View>
            <Text style={styles.menuText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </PressableScale>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Footy Soul</Text>
        <Text style={styles.footerVersion}>v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    marginBottom: spacing[4],
  },
  heroName: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginTop: spacing[3],
  },
  heroSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing[1],
    marginBottom: spacing[4],
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.accent,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  editProfileBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
  section: { paddingHorizontal: spacing[4], marginBottom: spacing[6] },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  statsRow: { flexDirection: 'row', gap: spacing[3] },
  viewAllStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    marginTop: spacing[3],
    paddingVertical: spacing[2],
  },
  viewAllStatsText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.accent },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  menuIconDanger: { backgroundColor: colors.dangerLight },
  menuText: { flex: 1, fontSize: fontSizes.base, color: colors.text, fontWeight: fontWeights.medium },
  dangerText: { color: colors.danger },
  footer: { alignItems: 'center', paddingVertical: spacing[6] },
  footerText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary },
  footerVersion: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
});
