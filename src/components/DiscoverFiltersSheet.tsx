import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { BottomSheet, SectionHeader, Chip } from '@/components/ui';
import { format, addDays } from 'date-fns';
import { colors, spacing, fontSizes } from '@/theme';
import {
  defaultDiscoverFilters,
  type DiscoverFiltersState,
  type PitchFilter,
  type PriceFilter,
  type TimeFilter,
  type DistanceFilter,
  type MinFreeSlotsFilter,
} from '@/types/filters';

type FavoriteVenueItem = { location_name: string };

type DiscoverFiltersSheetProps = {
  visible: boolean;
  onClose: () => void;
  filters: DiscoverFiltersState;
  onApply: (f: DiscoverFiltersState) => void;
  showDistance: boolean;
  favoriteVenues?: FavoriteVenueItem[];
};

export function DiscoverFiltersSheet({
  visible,
  onClose,
  filters,
  onApply,
  showDistance,
  favoriteVenues = [],
}: DiscoverFiltersSheetProps) {
  const [local, setLocal] = useState(filters);
  useEffect(() => { setLocal(filters); }, [filters, visible]);

  const update = <K extends keyof DiscoverFiltersState>(key: K, value: DiscoverFiltersState[K]) => {
    setLocal((p) => ({ ...p, [key]: value }));
  };

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const handleReset = () => {
    setLocal({ ...defaultDiscoverFilters });
  };

  // Preset date chips — computed once per render cycle
  const dateChips = useMemo<{ label: string; value: string | null }[]>(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');

    const dayOfWeek = today.getDay(); // 0 = Sun, 6 = Sat
    const daysUntilSat = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
    const nextSatDate = addDays(today, daysUntilSat);
    const nextSatStr = format(nextSatDate, 'yyyy-MM-dd');

    const daysUntilSun = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const nextSunDate = addDays(today, daysUntilSun);
    const nextSunStr = format(nextSunDate, 'yyyy-MM-dd');

    const chips: { label: string; value: string | null }[] = [
      { label: 'Any', value: null },
      { label: 'Today', value: todayStr },
      { label: 'Tomorrow', value: tomorrowStr },
    ];
    if (nextSatStr !== todayStr && nextSatStr !== tomorrowStr) {
      chips.push({ label: `Sat ${format(nextSatDate, 'd MMM')}`, value: nextSatStr });
    }
    if (nextSunStr !== todayStr && nextSunStr !== tomorrowStr) {
      chips.push({ label: `Sun ${format(nextSunDate, 'd MMM')}`, value: nextSunStr });
    }
    return chips;
  }, []);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      onApply={handleApply}
      onReset={handleReset}
      applyLabel="Apply"
      resetLabel="Reset"
    >
      {/* ── Date ── */}
      <SectionHeader title="Date" />
      <View style={styles.chipRow}>
        {dateChips.map((chip) => (
          <Chip
            key={chip.value ?? 'any'}
            label={chip.label}
            selected={local.selectedDate === chip.value}
            onPress={() => update('selectedDate', chip.value)}
          />
        ))}
      </View>

      {/* ── Favorite venues ── */}
      <SectionHeader title="Favorite venues" />
      {favoriteVenues.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.venueScroll}
          contentContainerStyle={styles.venueScrollContent}
        >
          {/* "All" chip — shows games across all favourite venues */}
          <Chip
            label="All"
            selected={local.favoriteVenuesOnly && local.selectedFavoriteVenue === null}
            onPress={() => {
              if (local.favoriteVenuesOnly && local.selectedFavoriteVenue === null) {
                setLocal((p) => ({ ...p, favoriteVenuesOnly: false, selectedFavoriteVenue: null }));
              } else {
                setLocal((p) => ({ ...p, favoriteVenuesOnly: true, selectedFavoriteVenue: null }));
              }
            }}
          />
          {/* One chip per favourite venue */}
          {favoriteVenues.map((v) => (
            <Chip
              key={v.location_name}
              label={v.location_name}
              selected={local.favoriteVenuesOnly && local.selectedFavoriteVenue === v.location_name}
              onPress={() => {
                if (
                  local.favoriteVenuesOnly &&
                  local.selectedFavoriteVenue === v.location_name
                ) {
                  // Tap active chip → deselect
                  setLocal((p) => ({ ...p, favoriteVenuesOnly: false, selectedFavoriteVenue: null }));
                } else {
                  setLocal((p) => ({ ...p, favoriteVenuesOnly: true, selectedFavoriteVenue: v.location_name }));
                }
              }}
            />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.noVenuesHint}>
          No favourite venues yet — heart a venue to pin it here.
        </Text>
      )}

      {/* ── Free slots ── */}
      <SectionHeader title="Free slots" />
      <View style={styles.chipRow}>
        {([0, 1, 2, 3, 5] as MinFreeSlotsFilter[]).map((v) => (
          <Chip
            key={v}
            label={v === 0 ? 'Any' : `At least ${v}`}
            selected={local.minFreeSlots === v}
            onPress={() => update('minFreeSlots', v)}
          />
        ))}
      </View>

      {/* ── Pitch type ── */}
      <SectionHeader title="Pitch type" />
      <View style={styles.chipRow}>
        {(['5-a-side', '7-a-side', '11-a-side', 'any'] as PitchFilter[]).map((v) => (
          <Chip
            key={v}
            label={v === 'any' ? 'Any' : v}
            selected={local.pitchType === v}
            onPress={() => update('pitchType', v)}
          />
        ))}
      </View>

      {/* ── Price ── */}
      <SectionHeader title="Price" />
      <View style={styles.chipRow}>
        {(['free', 'under_30', 'under_50', 'any'] as PriceFilter[]).map((v) => (
          <Chip
            key={v}
            label={
              v === 'any' ? 'Any' : v === 'free' ? 'Free' : v === 'under_30' ? 'Under 30' : 'Under 50'
            }
            selected={local.price === v}
            onPress={() => update('price', v)}
          />
        ))}
      </View>

      {/* ── Time of day ── */}
      <SectionHeader title="Time" />
      <View style={styles.chipRow}>
        {(['morning', 'afternoon', 'evening', 'any'] as TimeFilter[]).map((v) => (
          <Chip
            key={v}
            label={v === 'any' ? 'Any' : v.charAt(0).toUpperCase() + v.slice(1)}
            selected={local.time === v}
            onPress={() => update('time', v)}
          />
        ))}
      </View>

      {/* ── Distance ── */}
      {showDistance && (
        <>
          <SectionHeader title="Distance" />
          <View style={styles.chipRow}>
            {(['5km', '10km', 'any'] as DistanceFilter[]).map((v) => (
              <Chip
                key={v}
                label={v === 'any' ? 'Any' : v}
                selected={local.distance === v}
                onPress={() => update('distance', v)}
              />
            ))}
          </View>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  venueScroll: {
    marginBottom: spacing[2],
  },
  venueScrollContent: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingRight: spacing[2],
  },
  noVenuesHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing[4],
  },
});
