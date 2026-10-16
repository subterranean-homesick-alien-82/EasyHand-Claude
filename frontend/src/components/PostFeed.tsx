import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, type Category, type PostKind, type PostStatus } from '@/lib/api';
import { useFocusedQuery } from '@/lib/useApi';
import { colors, radius, spacing } from '@/theme';

import { CategoryPills } from './CategoryPills';
import { PostCard } from './PostCard';
import { EmptyState, ErrorText, RefreshButton } from './ui';

const KIND_FILTERS: { value: PostKind | null; label: string }[] = [
  { value: null, label: 'Everything' },
  { value: 'request', label: 'Needs a hand' },
  { value: 'offer', label: 'Offering' },
];

/**
 * The listings feed with search and filters. Used by the signed-in Home tab and by the
 * signed-out "Look around" screen, each with its own heading (`title`) above the filters.
 */
export function PostFeed({
  title,
  status,
  emptyMessage,
}: {
  title: ReactNode;
  status?: PostStatus;
  emptyMessage: string;
}) {
  const [category, setCategory] = useState<Category | null>(null);
  const [kind, setKind] = useState<PostKind | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const { data: posts, error, loading, refreshing, refresh } = useFocusedQuery(
    () => api.listPosts({ category: category ?? undefined, kind: kind ?? undefined, q: query || undefined, status }),
    [category, kind, query, status],
  );

  return (
    <FlatList
      data={posts ?? []}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>{title}</View>
            <RefreshButton onPress={refresh} refreshing={refreshing} />
          </View>

          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => setQuery(search.trim())}
              onBlur={() => setQuery(search.trim())}
              placeholder="Search listings"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={styles.searchInput}
            />
            {search ? (
              <Pressable
                accessibilityLabel="Clear search"
                onPress={() => {
                  setSearch('');
                  setQuery('');
                }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.pillsBleed}>
            <CategoryPills value={category} onChange={setCategory} includeAll />
          </View>

          <View style={styles.segment}>
            {KIND_FILTERS.map((f) => {
              const selected = f.value === kind;
              return (
                <Pressable
                  key={f.label}
                  onPress={() => setKind(f.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.segmentItem, selected && styles.segmentItemSelected]}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <ErrorText message={error} />
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
        ) : error ? null : (
          <EmptyState title="No listings yet" message={emptyMessage} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  titleBlock: { gap: 2, flex: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 18, color: colors.text },
  pillsBleed: { marginHorizontal: -spacing.lg },
  segment: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radius.md, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
  segmentItemSelected: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted, fontWeight: '600', fontSize: 16 },
  segmentTextSelected: { color: colors.text },
});
