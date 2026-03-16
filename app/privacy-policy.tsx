import { ScrollView, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, fontWeights } from '@/theme';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: March 2026</Text>

      <Text style={styles.section}>1. Information We Collect</Text>
      <Text style={styles.body}>
        When you use Footy Soul, we collect information you provide directly: your name, email address, phone number, and payment information. We also collect usage data such as games joined, venues visited, and in-app interactions.
      </Text>

      <Text style={styles.section}>2. How We Use Your Information</Text>
      <Text style={styles.body}>
        We use your information to: operate the app, process bookings and payments, send game reminders and notifications, improve our services, and communicate important updates.
      </Text>

      <Text style={styles.section}>3. Information Sharing</Text>
      <Text style={styles.body}>
        We share your name with other players in games you join. We share payment information with Stripe to process transactions. We do not sell your personal data to third parties.
      </Text>

      <Text style={styles.section}>4. Data Storage</Text>
      <Text style={styles.body}>
        Your data is stored securely using Supabase infrastructure. Payment data is handled by Stripe and never stored on our servers.
      </Text>

      <Text style={styles.section}>5. Your Rights</Text>
      <Text style={styles.body}>
        You can request access to, correction of, or deletion of your personal data at any time by contacting support@footysoul.com.
      </Text>

      <Text style={styles.section}>6. Contact</Text>
      <Text style={styles.body}>
        For questions about this privacy policy, contact us at support@footysoul.com.
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
