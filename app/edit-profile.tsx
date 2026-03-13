import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !supabase) return;
    // Use SECURITY DEFINER RPC to bypass profiles RLS recursion
    supabase.rpc('get_my_profile').then(({ data }) => {
      const row = (data as { name?: string; phone?: string }[] | null)?.[0];
      if (row) {
        setName(row.name ?? '');
        setPhone(row.phone ?? '');
      }
    });
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!user || !supabase) {
        Alert.alert('Error', 'Not signed in');
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim() || null, phone: phone.trim() || null })
        .eq('user_id', user.id);
      if (error) throw error;
      // Navigate back immediately — no blocking alert
      router.back();
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.form}>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="+971 50 123 4567"
          placeholderTextColor={colors.textMuted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Save profile changes"
          accessibilityRole="button"
        >
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Save changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  form: { paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[8] },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing[2],
    marginTop: spacing[4],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: fontSizes.base,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing[4],
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing[8],
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: fontSizes.base, fontWeight: fontWeights.semibold },
});
