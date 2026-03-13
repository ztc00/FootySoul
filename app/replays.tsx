import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useMyReplays, type ReplayItem } from '@/hooks/useMyReplays';
import { colors, spacing, fontSizes, fontWeights, radius } from '@/theme';

export default function ReplaysScreen() {
  const insets = useSafeAreaInsets();
  const { data: replays = [], isLoading } = useMyReplays();

  const renderItem = ({ item }: { item: ReplayItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/game/${item.game.id}`)}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>{item.game.title}</Text>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.info}>
          {format(new Date(item.game.start_time), 'EEE, MMM d · ha')} at {item.game.location_name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Loading replays...</Text>
      </View>
    );
  }

  if (replays.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="videocam-outline" size={64} color={colors.border} />
        <Text style={styles.emptyTitle}>No replays yet</Text>
        <Text style={styles.muted}>Past games you joined will appear here</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={replays}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.list,
        { paddingTop: spacing[4], paddingBottom: insets.bottom + spacing[8] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing[4] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  info: { fontSize: fontSizes.sm, color: colors.textSecondary, flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.text, marginTop: spacing[4] },
  muted: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing[2] },
});
