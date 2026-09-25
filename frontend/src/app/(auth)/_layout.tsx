import { Stack } from 'expo-router';

import { colors } from '@/theme';

// Signed-out visitors land on the welcome screen first.
export const unstable_settings = { anchor: 'welcome' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
