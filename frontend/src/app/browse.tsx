import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedTitle } from '@/components/FeedTitle';
import { PostFeed } from '@/components/PostFeed';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';

/** Open listings for visitors who haven't signed up yet, so nobody has to make an account just to look. */
export default function BrowseScreen() {
  const { user } = useAuth();
  if (user) return <Redirect href="/" />;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <PostFeed
        status="active"
        title={
          <FeedTitle
            greeting="Just looking? You're welcome here 👋"
            title="Open jobs"
            subtitle="See what neighbors in Memphis need help with and what they're offering to pay. No account needed."
          />
        }
        emptyMessage="There are no open listings right now. Check back soon!"
      />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Want to reply to someone or post your own?</Text>
        <Button title="Join EasyHand. It's free" onPress={() => router.push('/register')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  footerText: { fontSize: 17, color: colors.text, textAlign: 'center', fontWeight: '600' },
});
