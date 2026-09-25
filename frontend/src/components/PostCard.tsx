import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Post } from '@/lib/api';
import { categoryInfo, KIND_LABELS, STATUS_LABELS } from '@/lib/categories';
import { timeAgo } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

import { Avatar, Tag } from './ui';

export function PostCard({ post }: { post: Post }) {
  const cat = categoryInfo(post.category);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(`/posts/${post.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={[styles.stripe, { backgroundColor: cat.color }]} />
      <View style={styles.body}>
        <View style={styles.tagsRow}>
          <Tag label={cat.label} color={cat.color} />
          <Tag label={KIND_LABELS[post.kind]} color={post.kind === 'offer' ? colors.accent : colors.textMuted} />
          {post.status !== 'active' ? <Tag label={STATUS_LABELS[post.status]} color={colors.danger} /> : null}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={styles.description} numberOfLines={3}>
          {post.description}
        </Text>

        {post.image_url ? <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" /> : null}

        <View style={styles.metaRow}>
          {post.compensation ? (
            <View style={styles.meta}>
              <Ionicons name="cash-outline" size={15} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary, fontWeight: '700' }]}>{post.compensation}</Text>
            </View>
          ) : null}
          {post.neighborhood ? (
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={15} color={colors.textMuted} />
              <Text style={styles.metaText}>{post.neighborhood}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Avatar name={post.author?.name ?? '?'} size={26} />
          <Text style={styles.author}>{post.author?.name ?? 'Former member'}</Text>
          <Text style={styles.time}>· {timeAgo(post.created_at)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stripe: { width: 5 },
  body: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { fontSize: 19, fontWeight: '700', color: colors.text },
  description: { color: colors.textMuted, fontSize: 17, lineHeight: 24 },
  image: { width: '100%', height: 170, borderRadius: radius.md, backgroundColor: colors.border },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.textMuted, fontSize: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  author: { fontWeight: '600', color: colors.text, fontSize: 16 },
  time: { color: colors.textMuted, fontSize: 16 },
});
