import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { colors, spacing, radius, fontSizes, fontWeights } from '@/theme';

const DAYS_AHEAD = 60;
const ITEM_WIDTH = 56;

type DateCarouselProps = {
  selectedDate: string | null; // YYYY-MM-DD or null for "any"
  onSelectDate: (date: string | null) => void;
  showAny?: boolean; // show "Any" as first option
};

function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function DateCarousel({ selectedDate, onSelectDate, showAny = true }: DateCarouselProps) {
  const today = startOfDay(new Date());
  const dates: Date[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) dates.push(addDays(today, i));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {showAny && (
        <TouchableOpacity
          style={[styles.item, !selectedDate && styles.itemSelected]}
          onPress={() => onSelectDate(null)}
        >
          <Text style={[styles.anyLabel, !selectedDate && styles.anyLabelSelected]}>Any</Text>
        </TouchableOpacity>
      )}
      {dates.map((d) => {
        const key = toDateKey(d);
        const isSelected = selectedDate === key;
        const isToday = isSameDay(d, today);
        const dayLabel = isToday ? 'Today' : format(d, 'EEE');
        const dayNum = format(d, 'd');
        return (
          <TouchableOpacity
            key={key}
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => onSelectDate(key)}
          >
            <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>{dayLabel}</Text>
            <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{dayNum}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    width: ITEM_WIDTH,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSelected: {
    backgroundColor: colors.accent,
  },
  dayName: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing[1],
  },
  dayNameSelected: {
    color: colors.white,
  },
  dayNum: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  dayNumSelected: {
    color: colors.white,
  },
  anyLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  anyLabelSelected: {
    color: colors.white,
  },
});
