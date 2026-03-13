import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';

const MIN_PASSWORD_LENGTH = 6;

export default function SetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      router.replace('/(tabs)/home');
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setChecking(false);
      if (!session) router.replace('/(auth)/login');
    });
  }, []);

  const handleSave = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Error', `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Password set', 'Next time you can sign in with email + password.', [
        { text: 'Continue', onPress: () => router.replace('/(tabs)/home') },
      ]);
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Set a password</Text>
        <Text style={styles.subtitle}>
          Optional — lets you sign in with email + password instead of a code next time.
        </Text>

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`}
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text style={styles.label}>Confirm password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Re-enter password"
            placeholderTextColor={colors.textMuted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm((v) => !v)}>
            <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Save password</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6], paddingBottom: spacing[8] },
  title: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, textAlign: 'center', marginBottom: spacing[2], color: colors.text },
  subtitle: { fontSize: fontSizes.sm, textAlign: 'center', marginBottom: spacing[8], color: colors.textSecondary, lineHeight: 20 },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary, marginBottom: spacing[2] },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing[4],
  },
  passwordInput: { flex: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[4], fontSize: fontSizes.base, color: colors.text },
  eyeBtn: { paddingHorizontal: spacing[3] },
  button: { backgroundColor: colors.accent, paddingVertical: spacing[4], borderRadius: radius.md, alignItems: 'center', marginTop: spacing[2] },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: fontSizes.base, fontWeight: fontWeights.semibold },
  skipButton: { alignItems: 'center', marginTop: spacing[5] },
  skipText: { color: colors.textSecondary, fontSize: fontSizes.sm, textDecorationLine: 'underline' },
});
