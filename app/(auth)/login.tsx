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
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';

// Required for Google OAuth redirect to return cleanly
WebBrowser.maybeCompleteAuthSession();

type Screen = 'welcome' | 'otp' | 'password';

export default function LoginScreen() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [email, setEmail] = useState('');
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

  // ─── Google Sign In (Supabase OAuth via in-app browser) ──
  const handleGoogleSignIn = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const redirectTo = 'footysoul://google-auth';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        const url = result.url;
        // Tokens are in the URL fragment (#access_token=...&refresh_token=...)
        const fragment = url.includes('#') ? url.split('#')[1] : '';
        const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] : '';
        const params = new URLSearchParams(fragment || query);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const errorDesc = params.get('error_description') || params.get('error');

        if (errorDesc) {
          throw new Error(decodeURIComponent(errorDesc));
        }
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          await ensureProfile();
          router.replace('/(tabs)/home');
        } else {
          throw new Error(
            'Redirect did not include sign-in tokens. In Supabase Dashboard → Authentication → URL Configuration, add this to Redirect URLs: footysoul://google-auth'
          );
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
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: 'footysoul://auth/confirm',
        },
      });
      if (error) throw error;
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
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: 'email',
      });
      if (error) throw error;
      await ensureProfile();
      router.replace('/(auth)/set-password');
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
    const destination = email;
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
              name="mail-open-outline"
              size={48}
              color={colors.accent}
            />
          </View>
          <Text style={styles.title}>Check your email</Text>
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
            <Text style={styles.linkText}>← Change email</Text>
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
          <Image
            source={require('../../assets/icon.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Footy Soul</Text>

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

            {/* ─── Email Input ─── */}
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
  brandLogo: {
    width: 96,
    height: 96,
    borderRadius: 20,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    marginBottom: spacing[5],
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
