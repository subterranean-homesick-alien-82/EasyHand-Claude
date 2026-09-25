import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Button, Centered, EmptyState, ErrorText } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFocusedQuery } from '@/lib/useApi';
import { colors, spacing } from '@/theme';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const { data, error, loading } = useFocusedQuery(
    () => Promise.all([api.getUser(id), api.listPosts({ author_id: id, status: 'active' })]),
    [id],
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />;
  if (!data) return <Centered><ErrorText message={error ?? 'Neighbor not found'} /></Centered>;

  const [profile, posts] = data;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: profile.name }} />
      <ProfileHeader user={profile} />
      {me?.id !== profile.id ? (
        <Button
          title={`Message ${profile.name.split(' ')[0]}`}
          icon={<Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />}
          onPress={() => router.push({ pathname: '/chat/[userId]', params: { userId: profile.id, name: profile.name } })}
        />
      ) : null}
      <Text style={styles.sectionTitle}>Active listings</Text>
      {posts.length === 0 ? (
        <EmptyState title="Nothing posted right now" />
      ) : (
        <View style={{ gap: spacing.md }}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
});
