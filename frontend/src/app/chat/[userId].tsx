import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorText } from '@/components/ui';
import { api, type Message } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { clockTime } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const POLL_MS = 4000;

export default function ChatScreen() {
  const { userId, name, postId, postTitle } = useLocalSearchParams<{
    userId: string;
    name?: string;
    postId?: string;
    postTitle?: string;
  }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherName, setOtherName] = useState(name ?? '');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    try {
      const thread = await api.getThread(userId);
      // Only replace state when something changed, so polling doesn't cause needless re-renders.
      setMessages((prev) =>
        prev.length === thread.length && prev.at(-1)?.id === thread.at(-1)?.id ? prev : thread,
      );
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      if (!name) api.getUser(userId).then((u) => setOtherName(u.name), () => {});
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load, name, userId]),
  );

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const msg = await api.sendMessage({ recipient_id: userId, content, post_id: postId || undefined });
      setMessages((prev) => [...prev, msg]);
      setDraft('');
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ title: otherName || 'Chat' }} />
      {postId ? (
        <Link href={`/posts/${postId}`} asChild>
          <Pressable style={styles.context}>
            <Ionicons name="pricetag-outline" size={15} color={colors.primaryDark} />
            <Text style={styles.contextText} numberOfLines={1}>
              About: {postTitle || 'a listing'}
            </Text>
          </Pressable>
        </Link>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Say hello to {otherName || 'your neighbor'}! Coordinate the details, timing, and meeting spot here.
          </Text>
        }
        renderItem={({ item }) => {
          const mine = item.sender_id === user?.id;
          return (
            <View style={[styles.bubbleRow, mine && { justifyContent: 'flex-end' }]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, mine && { color: '#fff' }]}>{item.content}</Text>
                <Text style={[styles.bubbleTime, mine && { color: 'rgba(255,255,255,0.75)' }]}>{clockTime(item.timestamp)}</Text>
              </View>
            </View>
          );
        }}
      />

      <View style={{ paddingHorizontal: spacing.lg }}>
        <ErrorText message={error} />
      </View>
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          style={styles.input}
          onKeyPress={(e) => {
            // On web, Enter sends and Shift+Enter inserts a newline.
            const ev = e.nativeEvent as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
              (e as unknown as { preventDefault: () => void }).preventDefault();
              void send();
            }
          }}
        />
        <Pressable
          accessibilityLabel="Send message"
          onPress={send}
          disabled={!draft.trim() || sending}
          style={[styles.send, (!draft.trim() || sending) && { opacity: 0.5 }]}
        >
          <Ionicons name="send" size={22} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  contextText: { color: colors.primaryDark, fontWeight: '600', fontSize: 17, flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: 17, marginTop: 48, lineHeight: 24 },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.lg, gap: 2 },
  bubbleMine: { backgroundColor: colors.bubbleMine, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.bubbleTheirs, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 18, color: colors.text, lineHeight: 21 },
  bubbleTime: { fontSize: 14, color: colors.textMuted, alignSelf: 'flex-end' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    color: colors.text,
  },
  send: {
    backgroundColor: colors.primary,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
