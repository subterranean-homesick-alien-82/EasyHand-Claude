import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { PublicUser } from '@/lib/api';
import { colors, spacing } from '@/theme';

import { Avatar, Tag } from './ui';

export function ProfileHeader({ user }: { user: PublicUser }) {
  const since = new Date(user.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' });
  return (
    <View style={styles.container}>
      <Avatar name={user.name} size={84} />
      <Text style={styles.name}>{user.name}</Text>
      <View style={styles.metaRow}>
        {user.neighborhood ? (
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{user.neighborhood}</Text>
          </View>
        ) : null}
        <Text style={styles.metaText}>Neighbor since {since}</Text>
      </View>
      {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      {user.skills.length > 0 ? (
        <View style={styles.skills}>
          {user.skills.map((s) => (
            <Tag key={s} label={s} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: colors.textMuted, fontSize: 13 },
  bio: { color: colors.text, textAlign: 'center', lineHeight: 21, maxWidth: 480 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: spacing.xs },
});
