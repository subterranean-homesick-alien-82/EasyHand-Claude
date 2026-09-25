import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Avatar, EmptyState, ErrorText, RefreshButton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { useFocusedQuery } from '@/lib/useApi';
import { colors, spacing } from '@/theme';

export default function MessagesScreen() {
  const { user } = useAuth();
  const { data, error, loading, refreshing, refresh } = useFocusedQuery(() => api.listConversations(), []);

  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />;

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(c) => c.other_user.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <RefreshButton onPress={refresh} refreshing={refreshing} />
          <ErrorText message={error} />
        </View>
      }
      ListEmptyComponent={
        error ? null : (
          <EmptyState
            title="No conversations yet"
            message="Open a listing on the board and tap “Message” to start coordinating with a neighbor."
          />
        )
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => {
        const mine = item.last_message.sender_id === user?.id;
        return (
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              router.push({ pathname: '/chat/[userId]', params: { userId: item.other_user.id, name: item.other_user.name } })
            }
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primarySoft }]}
          >
            <Avatar name={item.other_user.name} size={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.other_user.name}
                </Text>
                <Text style={styles.time}>{timeAgo(item.last_message.timestamp)}</Text>
              </View>
              {item.other_user.neighborhood ? <Text style={styles.neighborhood}>{item.other_user.neighborhood}</Text> : null}
              <Text style={styles.preview} numberOfLines={1}>
                {mine ? 'You: ' : ''}
                {item.last_message.content}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.sm, maxWidth: 720, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { fontWeight: '700', fontSize: 18, color: colors.text, flexShrink: 1 },
  neighborhood: { color: colors.textMuted, fontSize: 15 },
  time: { color: colors.textMuted, fontSize: 15 },
  preview: { color: colors.textMuted, fontSize: 17 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 76 },
});
