import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors, radius, shadows, spacing } from '@/theme';

type CardProps = { children: React.ReactNode; style?: ViewStyle };

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    ...shadows.sm,
  },
});
