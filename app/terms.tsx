import { ScrollView, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Terms of Service</Text>
      <Text style={styles.updated}>Last updated: March 2026</Text>

      <Text style={styles.section}>1. Acceptance of Terms</Text>
      <Text style={styles.body}>
        By using Footy Soul, you agree to these terms. If you do not agree, please do not use the app.
      </Text>

      <Text style={styles.section}>2. Use of Service</Text>
      <Text style={styles.body}>
        Footy Soul is a platform for organising and joining football games. You must be at least 16 years old to use this service. You are responsible for maintaining the security of your account.
      </Text>

      <Text style={styles.section}>3. Bookings and Payments</Text>
      <Text style={styles.body}>
        When you join a game, you agree to pay the listed price. Payments are processed by Stripe. Refunds are available if you cancel at least 24 hours before the game starts. If the organiser cancels, you will receive a full refund regardless of timing.
      </Text>

      <Text style={styles.section}>4. Cancellations</Text>
      <Text style={styles.body}>
        Players may cancel bookings at any time. Refunds are only issued for cancellations made 24+ hours before the game start time. Organisers may cancel games at any time, in which case all players receive full refunds.
      </Text>

      <Text style={styles.section}>5. User Conduct</Text>
      <Text style={styles.body}>
        You agree not to use the platform for any unlawful purpose, harass other users, or post inappropriate content in game chats.
      </Text>

      <Text style={styles.section}>6. Liability</Text>
      <Text style={styles.body}>
        Footy Soul is a booking platform only. We are not responsible for injuries, disputes, or issues that occur during games. Participation in football activities is at your own risk.
      </Text>

      <Text style={styles.section}>7. Changes to Terms</Text>
      <Text style={styles.body}>
        We may update these terms from time to time. Continued use of the app constitutes acceptance of updated terms.
      </Text>

      <Text style={styles.section}>8. Contact</Text>
      <Text style={styles.body}>
        For questions about these terms, contact us at support@footysoul.com.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  heading: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, color: colors.text, marginBottom: spacing[1] },
  updated: { fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing[6] },
  section: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.text, marginTop: spacing[4], marginBottom: spacing[2] },
  body: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 22 },
});
