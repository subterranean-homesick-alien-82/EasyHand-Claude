import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ProfileHeader } from '@/components/ProfileHeader';
import { SkillsEditor } from '@/components/SkillsEditor';
import { Button, Card, EmptyState, ErrorText, Field } from '@/components/ui';
import { api, type PrivateUser } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFocusedQuery } from '@/lib/useApi';
import { colors, spacing } from '@/theme';

function ProfileEditor({ user, onDone }: { user: PrivateUser; onDone: () => void }) {
  const { updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [neighborhood, setNeighborhood] = useState(user.neighborhood);
  const [bio, setBio] = useState(user.bio);
  const [skills, setSkills] = useState(user.skills);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return setError('Name is required.');
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ name: name.trim(), neighborhood: neighborhood.trim(), bio: bio.trim(), skills });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: spacing.lg }}>
      <Field label="Name" value={name} onChangeText={setName} maxLength={80} />
      <Field label="Neighborhood" value={neighborhood} onChangeText={setNeighborhood} maxLength={80} placeholder="e.g. Cooper-Young" />
      <Field
        label="About you"
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={1000}
        placeholder="Tell neighbors what you're good at and when you're around."
      />
      <SkillsEditor value={skills} onChange={setSkills} />
      <ErrorText message={error} />
      <View style={styles.row}>
        <Button title="Cancel" variant="secondary" onPress={onDone} style={{ flex: 1 }} />
        <Button title="Save profile" onPress={save} loading={busy} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const { data: posts } = useFocusedQuery(() => api.listPosts({ author_id: user!.id }), [user?.id]);

  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {editing ? (
        <ProfileEditor user={user} onDone={() => setEditing(false)} />
      ) : (
        <>
          <ProfileHeader user={user} />
          {!user.bio && user.skills.length === 0 ? (
            <Text style={styles.nudge}>Add a bio and a few skills so neighbors know how you can help.</Text>
          ) : null}
          <Button title="Edit profile" variant="secondary" onPress={() => setEditing(true)} />
        </>
      )}

      <Text style={styles.sectionTitle}>My listings</Text>
      {posts && posts.length === 0 ? (
        <EmptyState title="You haven't posted yet" message="Listings you create will show up here." />
      ) : (
        <View style={{ gap: spacing.md }}>
          {(posts ?? []).map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </View>
      )}

      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <Text style={styles.email}>Signed in as {user.email}</Text>
        <Button title="Log out" variant="secondary" onPress={signOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', gap: spacing.md },
  nudge: { textAlign: 'center', color: colors.textMuted },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  email: { textAlign: 'center', color: colors.textMuted, fontSize: 13 },
});
