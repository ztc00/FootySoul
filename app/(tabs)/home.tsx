import { useState, useMemo, useEffect } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, RefreshControl, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { useGames, useBookingCounts } from '@/hooks/useGames';
import { useFavoriteVenues } from '@/hooks/useFavoriteVenues';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';
import { GameCard } from '@/components/GameCard';
import { DiscoverFiltersSheet } from '@/components/DiscoverFiltersSheet';
import { DateCarousel } from '@/components/DateCarousel';
import { filterGamesByDate, filterGamesByFilters } from '@/lib/filterGames';
import { defaultDiscoverFilters, type DiscoverFiltersState } from '@/types/filters';
import type { Game } from '@/types/database';

function matchesSearch(g: Game, counts: Record<string, number>, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const remaining = Math.max(0, g.capacity - (counts[g.id] ?? 0));
  return (
    (g.title && g.title.toLowerCase().includes(q)) ||
    (g.location_name && g.location_name.toLowerCase().includes(q)) ||
    (g.organizer?.display_name && g.organizer.display_name.toLowerCase().includes(q))
  );
}

type Section = { title: string; data: Game[] };

function groupGamesByDate(games: Game[]): Section[] {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const map = new Map<string, Game[]>();
  games.forEach((g) => {
    const d = new Date(g.start_time);
    let key: string;
    if (isSameDay(d, today)) key = 'Today';
    else if (isSameDay(d, tomorrow)) key = 'Tomorrow';
    else key = format(d, 'EEE d MMM');
    const list = map.get(key) ?? [];
    list.push(g);
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
    .sort(([, a], [, b]) => new Date(a[0].start_time).getTime() - new Date(b[0].start_time).getTime())
    .forEach(([, data]) => sections.push({ title: format(new Date(data[0].start_time), 'EEE d MMM'), data }));
  return sections;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data: games = [], isLoading, isError, error, refetch } = useGames();
  const gameIds = useMemo(() => games.map((g) => g.id), [games]);
  const { data: counts = {} } = useBookingCounts(gameIds);
  const { favoritesForFilter, data: favoriteVenuesList } = useFavoriteVenues();

  const [filters, setFilters] = useState<DiscoverFiltersState>(defaultDiscoverFilters);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') setLocationGranted(true);
    });
  }, []);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const byDate = filterGamesByDate(games, filters.selectedDate);
    const byFilters = filterGamesByFilters(byDate, filters, favoritesForFilter, counts);
    return byFilters.filter((g) => matchesSearch(g, counts, searchQuery));
  }, [games, filters, favoritesForFilter, counts, searchQuery]);

  const sections = useMemo(() => groupGamesByDate(filtered), [filtered]);

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  const renderItem = ({ item }: { item: Game }) => (
    <GameCard
      game={item}
      spotsFilled={counts[item.id] ?? 0}
      locked={item.visibility === 'invite_only'}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, location or organiser"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>
      <View style={styles.calendarBar}>
        <View style={styles.calendarWrap}>
          <DateCarousel
            selectedDate={filters.selectedDate}
            onSelectDate={(date) => setFilters((f) => ({ ...f, selectedDate: date }))}
            showAny={true}
          />
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFiltersVisible(true)}
        >
          <Ionicons name="options-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Loading games...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={64} color={colors.border} />
          <Text style={styles.emptyTitle}>Connection error</Text>
          <Text style={styles.muted}>{(error as Error)?.message ?? 'Could not load games'}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="football-outline" size={64} color={colors.border} />
          <Text style={styles.emptyTitle}>No games match</Text>
          <Text style={styles.muted}>Try changing filters or check back later</Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => { setFilters(defaultDiscoverFilters); setSearchQuery(''); }}
          >
            <Text style={styles.resetBtnText}>Reset filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          style={styles.listContainer}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing[8] }]}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />
          }
        />
      )}
      <DiscoverFiltersSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        filters={filters}
        onApply={setFilters}
        showDistance={locationGranted}
        favoriteVenues={favoriteVenuesList.map((v) => ({ location_name: v.location_name }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    marginBottom: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 10,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.text,
    paddingVertical: spacing[1],
  },
  calendarBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingRight: spacing[2],
  },
  calendarWrap: { flex: 1, minWidth: 0 },
  filterBtn: { padding: spacing[2] },
  listContainer: { flex: 1 },
  list: { padding: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[8] },
  sectionHeader: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text, marginTop: spacing[4] },
  muted: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing[1] },
  resetBtn: {
    marginTop: spacing[4],
    backgroundColor: colors.accent,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  resetBtnText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.white },
});
