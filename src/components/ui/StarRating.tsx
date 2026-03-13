import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';

type StarRatingProps = {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
};

export function StarRating({ value, max = 5, onChange, readonly }: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <View style={styles.row}>
      {stars.map((v) => (
        <Pressable
          key={v}
          onPress={() => !readonly && onChange?.(v)}
          disabled={readonly}
          style={styles.star}
        >
          <Ionicons
            name={v <= value ? 'star' : 'star-outline'}
            size={28}
            color={v <= value ? colors.warning : colors.border}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  star: { padding: spacing[1] },
});
