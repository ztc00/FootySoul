import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';

// Required for Google OAuth redirect to return cleanly
WebBrowser.maybeCompleteAuthSession();

type Screen = 'welcome' | 'otp' | 'password';
type InputMode = 'email' | 'phone';

export default function LoginScreen() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [inputMode, setInputMode] = useState<InputMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (cooldownRef.current) clearInterval(cooldownRef.current);
      };
    }
  }, [resendCooldown]);

  const ensureProfile = async () => {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return;
    const { data: existingId } = await supabase!.rpc('get_my_profile_id');
    if (existingId) return;
    const { error } = await supabase!.from('profiles').upsert(
      {
        user_id: user.id,
        phone: '',
        email: user.email ?? null,
        role: 'player',
      },
      { onConflict: 'user_id' }
    );
    if (error) {
      console.warn('ensureProfile upsert failed:', error.message);
    }
  };

  // ─── Apple Sign In ───────────────────────────────────────
  const handleAppleSignIn = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple');
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      await ensureProfile();
      router.replace('/(tabs)/home');
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return; // user cancelled
      const msg = err?.message || 'Apple sign in failed';
      if (msg.includes('provider') || msg.includes('not enabled')) {
        Alert.alert(
          'Apple Sign In Not Configured',
          'Enable the Apple provider in Supabase Dashboard → Authentication → Providers → Apple.'
        );
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Google Sign In ──────────────────────────────────────
  const handleGoogleSignIn = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const redirectUrl = makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        // Extract tokens from the redirect URL fragment
        const url = result.url;
        const params = new URLSearchParams(url.includes('#') ? url.split('#')[1] : url.split('?')[1]);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          await ensureProfile();
          router.replace('/(tabs)/home');
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'Google sign in failed';
      if (msg.includes('provider') || msg.includes('not enabled')) {
        Alert.alert(
          'Google Sign In Not Configured',
          'Enable the Google provider in Supabase Dashboard → Authentication → Providers → Google.'
        );
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Send OTP ────────────────────────────────────────────
  const handleSendOTP = async () => {
    if (!supabase) return;
    if (inputMode === 'email' && !email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (inputMode === 'phone' && !phone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    setLoading(true);
    try {
      if (inputMode === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo: 'footysoul://auth/confirm',
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: phone.startsWith('+') ? phone : `+971${phone}`,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
      }
      setScreen('otp');
      setResendCooldown(60);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  // ─── Verify OTP ──────────────────────────────────────────
  const handleVerifyOTP = async () => {
    if (!supabase || !otp) {
      Alert.alert('Error', 'Please enter the code');
      return;
    }
    setLoading(true);
    try {
      if (inputMode === 'email') {
        const { error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otp,
          type: 'email',
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.verifyOtp({
          phone: phone.startsWith('+') ? phone : `+971${phone}`,
          token: otp,
          type: 'sms',
        });
        if (error) throw error;
      }
      await ensureProfile();
      if (inputMode === 'email') {
        router.replace('/(auth)/set-password');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend OTP ──────────────────────────────────────────
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    await handleSendOTP();
  };

  // ─── Password Sign In ────────────────────────────────────
  const handleSignInWithPassword = async () => {
    if (!supabase || !email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      await ensureProfile();
      router.replace('/(tabs)/home');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Invalid login')) {
        Alert.alert('Sign in failed', 'Wrong email or password.');
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // OTP verification screen
  // ═══════════════════════════════════════════════════════════
  if (screen === 'otp') {
    const destination = inputMode === 'email' ? email : `+971${phone}`;
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name={inputMode === 'email' ? 'mail-open-outline' : 'chatbubble-outline'}
              size={48}
              color={colors.accent}
            />
          </View>
          <Text style={styles.title}>Check your {inputMode === 'email' ? 'email' : 'phone'}</Text>
          <Text style={styles.subtitle}>
            We sent a code to{' '}
            <Text style={styles.subtitleBold}>{destination}</Text>
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter code"
            placeholderTextColor={colors.textMuted}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={8}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Verify code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleResendOTP}
            disabled={resendCooldown > 0}
          >
            <Text style={[styles.linkText, resendCooldown > 0 && styles.linkTextDisabled]}>
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => { setScreen('welcome'); setOtp(''); }}
          >
            <Text style={styles.linkText}>
              ← Change {inputMode === 'email' ? 'email' : 'number'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Password sign-in screen
  // ═══════════════════════════════════════════════════════════
  if (screen === 'password') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.accent} />
          </View>
          <Text style={styles.title}>Sign in with password</Text>
          <Text style={styles.subtitle}>Enter your email and password</Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignInWithPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setScreen('welcome')}
          >
            <Text style={styles.linkText}>← Back to email code</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Welcome screen (main login)
  // ═══════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Branding */}
        <View style={styles.brandRow}>
          <Ionicons name="football" size={48} color={colors.accent} />
        </View>
        <Text style={styles.title}>FootySoul</Text>
        <Text style={styles.tagline}>Pick-up games in Dubai</Text>

        {!supabase ? (
          <View style={styles.configBanner}>
            <Ionicons name="warning-outline" size={18} color={colors.warning} />
            <Text style={styles.configHint}>
              Supabase not configured. Add env vars to enable sign in.
            </Text>
          </View>
        ) : (
          <>
            {/* ─── Social Sign In ─── */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <Ionicons name="logo-apple" size={20} color={colors.text} />
                <Text style={styles.socialButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={18} color={colors.text} />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* ─── Divider ─── */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ─── Email / Phone Input ─── */}
            {inputMode === 'email' ? (
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            ) : (
              <View style={styles.phoneInputContainer}>
                <View style={styles.phonePrefixWrap}>
                  <Text style={styles.phonePrefix}>🇦🇪 +971</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="50 123 4567"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Continue</Text>
              )}
            </TouchableOpacity>

            {/* ─── Toggle email ↔ phone ─── */}
            <TouchableOpacity
              style={styles.toggleLink}
              onPress={() => setInputMode(inputMode === 'email' ? 'phone' : 'email')}
            >
              <Text style={styles.toggleLinkText}>
                {inputMode === 'email' ? 'Use phone number instead' : 'Use email instead'}
              </Text>
            </TouchableOpacity>

            {/* ─── Password link ─── */}
            <TouchableOpacity
              style={styles.passwordLink}
              onPress={() => setScreen('password')}
            >
              <Text style={styles.passwordLinkText}>Already have a password? Sign in</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
  },
  brandRow: {
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    marginBottom: spacing[1],
    color: colors.text,
  },
  tagline: {
    fontSize: fontSizes.base,
    textAlign: 'center',
    marginBottom: spacing[8],
    color: colors.textSecondary,
  },
  subtitle: {
    fontSize: fontSizes.base,
    textAlign: 'center',
    marginBottom: spacing[8],
    color: colors.textSecondary,
  },
  subtitleBold: {
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  configBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  configHint: {
    fontSize: fontSizes.sm,
    color: colors.text,
    flex: 1,
  },

  // ─── Social buttons ────────────────────────────────────
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    marginBottom: spacing[3],
  },
  socialButtonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },

  // ─── Divider ───────────────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[4],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: spacing[4],
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },

  // ─── Input ─────────────────────────────────────────────
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: fontSizes.base,
    marginBottom: spacing[3],
    backgroundColor: colors.surface,
    color: colors.text,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing[3],
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  phonePrefixWrap: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[4],
    backgroundColor: colors.surfaceMuted,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  phonePrefix: {
    fontSize: fontSizes.base,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing[3],
    fontSize: fontSizes.base,
    color: colors.text,
  },

  // ─── Password ──────────────────────────────────────────
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing[3],
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: fontSizes.base,
    color: colors.text,
  },
  eyeBtn: {
    paddingHorizontal: spacing[3],
  },

  // ─── Primary button ────────────────────────────────────
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing[4],
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing[1],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },

  // ─── Links ─────────────────────────────────────────────
  toggleLink: {
    marginTop: spacing[5],
    alignItems: 'center',
  },
  toggleLinkText: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  passwordLink: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
  passwordLinkText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  linkButton: {
    marginTop: spacing[5],
    alignItems: 'center',
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    textDecorationLine: 'underline',
  },
  linkTextDisabled: {
    color: colors.textMuted,
    textDecorationLine: 'none',
  },
});
