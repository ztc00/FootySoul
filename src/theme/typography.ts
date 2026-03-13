import { TextStyle } from 'react-native';

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
} as const;

export const fontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const typography: Record<string, TextStyle> = {
  title: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold },
  titleSmall: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold },
  body: { fontSize: fontSizes.base, fontWeight: fontWeights.normal },
  bodySmall: { fontSize: fontSizes.sm, fontWeight: fontWeights.normal },
  caption: { fontSize: fontSizes.xs, fontWeight: fontWeights.normal },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium },
  overline: { fontSize: fontSizes.xs, fontWeight: fontWeights.medium },
};
