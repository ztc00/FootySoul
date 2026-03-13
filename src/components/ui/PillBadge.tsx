import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fontSizes, fontWeights } from '@/theme';

type PillBadgeProps = { label: string; variant?: 'default' | 'accent' };

export function PillBadge({ label, variant = 'default' }: PillBadgeProps) {
  return (
    <View style={[styles.pill, variant === 'accent' && styles.pillAccent]}>
      <Text style={[styles.text, variant === 'accent' && styles.textAccent]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  pillAccent: { backgroundColor: colors.accent },
  text: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text },
  textAccent: { color: colors.white },
});
