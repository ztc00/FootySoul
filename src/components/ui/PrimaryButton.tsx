import React from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, spacing, fontSizes, fontWeights } from '@/theme';
import { PressableScale } from './PressableScale';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({ title, onPress, loading, disabled }: PrimaryButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, (disabled || loading) && styles.btnDisabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing[4],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.6 },
  text: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.white },
});
