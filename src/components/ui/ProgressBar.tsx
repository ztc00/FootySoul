import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';

type ProgressBarProps = { value: number; max: number; height?: number; style?: ViewStyle };

export function ProgressBar({ value, max, height = 6, style }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={[styles.track, { height }, style]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
});
