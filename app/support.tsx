import { ScrollView, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';

export default function SupportScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Support</Text>
      <Text style={styles.updated}>Last updated: March 2026</Text>

      <Text style={styles.section}>How to get help</Text>
      <Text style={styles.body}>
        If you have any questions, issues, or feedback about Footy Soul, we’d love to hear from you.
      </Text>

      <Text style={styles.section}>Contact</Text>
      <Text style={styles.body}>
        Email us at <Text style={styles.bold}>support@footysoul.com</Text>. We aim to respond within 2–3 business days.
      </Text>

      <Text style={styles.section}>Common topics</Text>
      <Text style={styles.body}>
        - Problems signing in with Apple, Google, or email{'\n'}
        - Issues joining or creating a game{'\n'}
        - Payment or refund questions{'\n'}
        - Reporting inappropriate behaviour or content
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  heading: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing[1],
  },
  updated: { fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing[6] },
  section: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  body: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 22 },
  bold: { fontWeight: fontWeights.semibold, color: colors.text },
});

