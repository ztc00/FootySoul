import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontWeights } from '@/theme';

const AVATAR_COLORS = [
  { bg: '#DCFCE7', fg: '#166534' }, // green
  { bg: '#DBEAFE', fg: '#1E40AF' }, // blue
  { bg: '#FEF9C3', fg: '#854D0E' }, // yellow
  { bg: '#FCE7F3', fg: '#9D174D' }, // pink
  { bg: '#E0E7FF', fg: '#3730A3' }, // indigo
  { bg: '#FED7AA', fg: '#9A3412' }, // orange
  { bg: '#CCFBF1', fg: '#115E59' }, // teal
  { bg: '#F3E8FF', fg: '#6B21A8' }, // purple
];

function initials(name: string | null | undefined): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function nameToColor(name: string | null | undefined): (typeof AVATAR_COLORS)[0] {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type AvatarCircleProps = { name?: string | null; size?: number };

export function AvatarCircle({ name, size = 40 }: AvatarCircleProps) {
  const palette = nameToColor(name);
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { fontSize: size * 0.38, color: palette.fg }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontWeight: fontWeights.semibold },
});
