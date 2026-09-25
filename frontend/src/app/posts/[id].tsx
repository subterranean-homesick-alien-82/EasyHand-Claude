import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card, Centered, ErrorText, Tag } from '@/components/ui';
import { api, type PostStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { categoryInfo, KIND_LABELS, STATUS_LABELS } from '@/lib/categories';
import { timeAgo } from '@/lib/format';
import { useFocusedQuery } from '@/lib/useApi';
import { colors, radius, spacing } from '@/theme';

function confirm(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert('Are you sure?', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: post, setData, error, loading } = useFocusedQuery(() => api.getPost(id), [id]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />;
  if (!post) return <Centered><ErrorText message={error ?? 'Listing not found'} /></Centered>;

  const cat = categoryInfo(post.category);
  const isMine = post.author_id === user?.id;

  const setStatus = async (status: PostStatus) => {
    setBusy(status);
    setActionError(null);
    try {
      setData(await api.updatePostStatus(post.id, status));
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!(await confirm('Delete this listing? This cannot be undone.'))) return;
    setBusy('delete');
    try {
      await api.deletePost(post.id);
      router.back();
    } catch (err) {
      setActionError((err as Error).message);
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: cat.label }} />
      <View style={styles.tags}>
        <Tag label={cat.label} color={cat.color} />
        <Tag label={KIND_LABELS[post.kind]} color={post.kind === 'offer' ? colors.accent : colors.textMuted} />
        <Tag label={STATUS_LABELS[post.status]} color={post.status === 'active' ? colors.primary : colors.danger} />
      </View>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.posted}>
        Posted {timeAgo(post.created_at)}
        {post.neighborhood ? ` · ${post.neighborhood}` : ''}
      </Text>

      {post.image_url ? <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" /> : null}

      {post.compensation ? (
        <View style={styles.compensation}>
          <Ionicons name="cash-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.compensationText}>{post.compensation}</Text>
        </View>
      ) : null}

      <Text style={styles.description}>{post.description}</Text>

      {post.author ? (
        <Link href={`/users/${post.author.id}`} asChild>
          <Pressable>
            <Card style={styles.authorCard}>
              <Avatar name={post.author.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.authorName}>{isMine ? 'You' : post.author.name}</Text>
                {post.author.neighborhood ? <Text style={styles.authorMeta}>{post.author.neighborhood}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Card>
          </Pressable>
        </Link>
      ) : null}

      <ErrorText message={actionError} />

      {isMine ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>Manage your listing</Text>
          <View style={styles.row}>
            {post.status !== 'active' ? (
              <Button title="Reopen" variant="secondary" style={{ flex: 1 }} loading={busy === 'active'} onPress={() => setStatus('active')} />
            ) : (
              <Button title="Mark claimed" variant="secondary" style={{ flex: 1 }} loading={busy === 'claimed'} onPress={() => setStatus('claimed')} />
            )}
            {post.status !== 'completed' ? (
              <Button title="Mark completed" style={{ flex: 1 }} loading={busy === 'completed'} onPress={() => setStatus('completed')} />
            ) : null}
          </View>
          <Button title="Delete listing" variant="danger" loading={busy === 'delete'} onPress={remove} />
        </View>
      ) : post.author ? (
        <Button
          title={`Message ${post.author.name.split(' ')[0]}`}
          icon={<Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />}
          onPress={() =>
            router.push({
              pathname: '/chat/[userId]',
              params: { userId: post.author_id, name: post.author!.name, postId: post.id, postTitle: post.title },
            })
          }
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  posted: { color: colors.textMuted },
  image: { width: '100%', height: 260, borderRadius: radius.lg, backgroundColor: colors.border },
  compensation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  compensationText: { fontWeight: '700', color: colors.primaryDark, fontSize: 16 },
  description: { fontSize: 16, lineHeight: 24, color: colors.text },
  authorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  authorName: { fontWeight: '700', fontSize: 16, color: colors.text },
  authorMeta: { color: colors.textMuted, fontSize: 13 },
  sectionLabel: { fontWeight: '700', color: colors.textMuted, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
});
