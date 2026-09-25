import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ReportButton } from '@/components/ReportButton';
import { Button, Centered, EmptyState, ErrorText } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFocusedQuery } from '@/lib/useApi';
import { colors, spacing } from '@/theme';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me, setUser } = useAuth();
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const { data, error, loading } = useFocusedQuery(
    () => Promise.all([api.getUser(id), api.listPosts({ author_id: id, status: 'active' })]),
    [id],
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />;
  if (!data) return <Centered><ErrorText message={error ?? 'Neighbor not found'} /></Centered>;

  const [profile, posts] = data;
  const isMe = me?.id === profile.id;
  const blocked = !!me?.blocked_ids.includes(profile.id);

  const toggleBlock = async () => {
    if (!blocked && !(await confirmBlock(profile.name))) return;
    setBlockBusy(true);
    setBlockError(null);
    try {
      setUser(blocked ? await api.unblockUser(profile.id) : await api.blockUser(profile.id));
    } catch (err) {
      setBlockError((err as Error).message);
    } finally {
      setBlockBusy(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: profile.name }} />
      <ProfileHeader user={profile} />
      {blocked ? <Text style={styles.blocked}>You have blocked {profile.name}. They can’t message you.</Text> : null}
      {!isMe && !blocked ? (
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
      {!isMe ? (
        <View style={styles.safety}>
          <ErrorText message={blockError} />
          <Button
            title={blocked ? `Unblock ${profile.name.split(' ')[0]}` : `Block ${profile.name.split(' ')[0]}`}
            variant="secondary"
            loading={blockBusy}
            onPress={toggleBlock}
          />
          <ReportButton targetType="user" targetId={profile.id} label="Report this person" />
        </View>
      ) : null}
    </ScrollView>
  );
}

function confirmBlock(name: string): Promise<boolean> {
  const message = `${name} won’t be able to message you, and you won’t see their listings.`;
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`Block ${name}?\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(`Block ${name}?`, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Block', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  safety: { marginTop: spacing.xl, gap: spacing.sm },
  blocked: { fontSize: 17, color: colors.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
});
