import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';

type SectionHeaderProps = { title: string };

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[2] },
  title: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textMuted, textTransform: 'uppercase' },
});
