import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useGame } from '@/hooks/useGames';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, fontSizes, fontWeights } from '@/theme';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

type MessageRow = {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  sender_name?: string;
};

function firstNameLastInitial(name: string | null): string {
  if (!name || !name.trim()) return 'Player';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  return parts[0];
}

export default function GameChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { data: game } = useGame(id ?? '');
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (game) {
      navigation.setOptions({ title: format(new Date(game.start_time), 'EEE ha') + ' · ' + game.location_name });
    }
  }, [game, navigation]);

  useEffect(() => {
    if (!id || !supabase) return;
    const channel = supabase
      .channel(`game:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `game_id=eq.${id}` },
        async (payload) => {
          const row = payload.new as MessageRow;
          const { data: name } = await supabase
            .rpc('get_user_name', { p_user_id: row.user_id });
          setMessages((prev) => [
            ...prev,
            { ...row, sender_name: name ?? undefined },
          ]);
        }
      )
      .subscribe();

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('messages')
        .select('id, text, created_at, user_id')
        .eq('game_id', id)
        .order('created_at', { ascending: true });
      const withNames = await Promise.all(
        (data ?? []).map(async (m) => {
          const { data: name } = await supabase
            .rpc('get_user_name', { p_user_id: m.user_id });
          return { ...m, sender_name: name ?? undefined };
        })
      );
      setMessages(withNames);
      setLoading(false);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const send = async () => {
    const text = input.trim();
    if (!text || !user || !supabase) return;
    setSending(true);
    setInput('');
    try {
      await supabase.from('messages').insert({ game_id: id, user_id: user.id, text });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {
      // Message send failed
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: MessageRow }) => {
    const isMe = item.user_id === user?.id;
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.sender, isMe && styles.senderMe]}>
          {firstNameLastInitial(item.sender_name)}
        </Text>
        <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.text}</Text>
        <Text style={[styles.time, isMe && styles.timeMe]}>
          {format(new Date(item.created_at), 'h:mm a')}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubble-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptyHint}>Be the first to say something!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        />
      )}
      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, spacing[2]) }]}>
        <TextInput
          style={styles.input}
          placeholder="Write your comment..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          accessibilityLabel="Message input"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!input.trim() || sending}
          accessibilityLabel="Send message"
          accessibilityRole="button"
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  emptyText: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.text, marginTop: spacing[3] },
  emptyHint: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing[1] },
  list: { padding: spacing[4], paddingBottom: spacing[2] },
  bubble: {
    maxWidth: '80%',
    padding: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[2],
  },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: colors.surfaceMuted },
  // "Them" bubble text — dark colours on light background
  sender: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.textSecondary, marginBottom: spacing[1] },
  msgText: { fontSize: fontSizes.base, color: colors.text },
  time: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing[1] },
  // "Me" bubble text — white on green background
  senderMe: { color: 'rgba(255,255,255,0.75)' },
  msgTextMe: { color: colors.white },
  timeMe: { color: 'rgba(255,255,255,0.6)' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing[2], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: fontSizes.base,
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: { marginLeft: spacing[2], paddingVertical: spacing[2], paddingHorizontal: spacing[4], justifyContent: 'center', backgroundColor: colors.accent, borderRadius: radius.md },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.white },
});
