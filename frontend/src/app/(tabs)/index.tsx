import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedTitle } from '@/components/FeedTitle';
import { PostFeed } from '@/components/PostFeed';
import { useAuth } from '@/lib/auth';

export default function FeedScreen() {
  const { user } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <PostFeed
        title={
          <FeedTitle
            greeting={`Hi ${user?.name.split(' ')[0] ?? 'neighbor'} 👋`}
            title="Community Board"
            subtitle={`What's happening around ${user?.neighborhood || 'Memphis'}`}
          />
        }
        emptyMessage="Be the first! Tap “Post” at the bottom of the screen to ask for or offer help."
      />
    </SafeAreaView>
  );
}
