import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { colors, spacing, radius, fontSizes, fontWeights } from '@/theme';
import { PrimaryButton, Chip, StarRating, SectionHeader } from '@/components/ui';

const FEEDBACK_TAGS = [
  'Good pitch',
  'Good vibes',
  'Balanced teams',
  'On time',
  'Not organized',
  'Overcrowded',
  'Bad pitch',
];

export default function GameFeedbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [playAgain, setPlayAgain] = useState<boolean | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const submit = async () => {
    if (!user || !id || !supabase || rating === 0) return;
    setSending(true);
    try {
      await supabase.from('feedback').upsert(
        {
          game_id: id,
          user_id: user.id,
          rating,
          play_again: playAgain ?? false,
          tags,
          comment: comment.slice(0, 200) || null,
        },
        { onConflict: 'game_id,user_id' }
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      setTimeout(() => router.back(), 1500);
    } catch (e) {
      Alert.alert('Error', 'Could not submit feedback');
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.center}>
        <Text style={styles.thankYou}>Thank you!</Text>
        <Text style={styles.thankSub}>Your feedback helps the community.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="Rate this game" />
      <StarRating value={rating} onChange={setRating} />
      <SectionHeader title="Would you play again?" />
      <View style={styles.row}>
        <Chip label="Yes" selected={playAgain === true} onPress={() => setPlayAgain(true)} />
        <Chip label="No" selected={playAgain === false} onPress={() => setPlayAgain(false)} />
      </View>
      <SectionHeader title="Tags (optional)" />
      <View style={styles.chipRow}>
        {FEEDBACK_TAGS.map((tag) => (
          <Chip key={tag} label={tag} selected={tags.includes(tag)} onPress={() => toggleTag(tag)} />
        ))}
      </View>
      <SectionHeader title="Comment (optional, max 200)" />
      <TextInput
        style={styles.input}
        placeholder="Optional comment..."
        placeholderTextColor={colors.textMuted}
        value={comment}
        onChangeText={(t) => setComment(t.slice(0, 200))}
        multiline
        maxLength={200}
      />
      <Text style={styles.hint}>{comment.length}/200</Text>
      <PrimaryButton
        title="Submit feedback"
        onPress={submit}
        loading={sending}
        disabled={rating === 0}
      />
      {rating === 0 && (
        <Text style={styles.ratingHint}>Tap a star above to rate this game</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  thankYou: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, color: colors.text },
  thankSub: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing[2] },
  row: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[3],
    fontSize: fontSizes.base,
    color: colors.text,
    minHeight: 80,
    marginBottom: spacing[1],
  },
  hint: { fontSize: fontSizes.xs, color: colors.textMuted, marginBottom: spacing[4] },
  ratingHint: { fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing[2] },
});
