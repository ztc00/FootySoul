import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fontSizes, fontWeights } from '@/theme';

type StatCardProps = { label: string; value: string | number };

export function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[4],
    minWidth: 96,
    alignItems: 'center',
  },
  value: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, color: colors.text },
  label: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing[1] },
});
