import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryPills } from '@/components/CategoryPills';
import { PostCard } from '@/components/PostCard';
import { EmptyState, ErrorText } from '@/components/ui';
import { api, type Category, type PostKind } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFocusedQuery } from '@/lib/useApi';
import { colors, radius, spacing } from '@/theme';

const KIND_FILTERS: { value: PostKind | null; label: string }[] = [
  { value: null, label: 'Everything' },
  { value: 'request', label: 'Needs help' },
  { value: 'offer', label: 'Offering help' },
];

export default function FeedScreen() {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [kind, setKind] = useState<PostKind | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const { data: posts, error, loading, refreshing, refresh } = useFocusedQuery(
    () => api.listPosts({ category: category ?? undefined, kind: kind ?? undefined, q: query || undefined }),
    [category, kind, query],
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={styles.greeting}>Hi {user?.name.split(' ')[0] ?? 'neighbor'} 👋</Text>
              <Text style={styles.title}>Community Board</Text>
              <Text style={styles.subtitle}>What's happening around {user?.neighborhood || 'Memphis'}</Text>
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
            <EmptyState title="No listings yet" message="Be the first to post something for your neighbors from the Post tab." />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  titleBlock: { gap: 2 },
  greeting: { color: colors.textMuted, fontSize: 15 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted },
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
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 16, color: colors.text },
  pillsBleed: { marginHorizontal: -spacing.lg },
  segment: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radius.md, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
  segmentItemSelected: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  segmentTextSelected: { color: colors.text },
});
