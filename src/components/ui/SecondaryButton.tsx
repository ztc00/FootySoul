import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fontSizes, fontWeights } from '@/theme';
import { PressableScale } from './PressableScale';

type SecondaryButtonProps = { title: string; onPress: () => void; disabled?: boolean };

export function SecondaryButton({ title, onPress, disabled }: SecondaryButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, disabled && styles.btnDisabled]}
    >
      <Text style={styles.text}>{title}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing[4],
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDisabled: { opacity: 0.6 },
  text: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.text },
});
