import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName, focusedName: IconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? focusedName : name} color={color} size={size} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Explore', headerShown: false, tabBarIcon: tabIcon('compass-outline', 'compass') }} />
      <Tabs.Screen name="post" options={{ title: 'New Listing', tabBarLabel: 'Post', tabBarIcon: tabIcon('add-circle-outline', 'add-circle') }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: tabIcon('chatbubbles-outline', 'chatbubbles') }} />
      <Tabs.Screen name="profile" options={{ title: 'My Profile', tabBarLabel: 'Profile', tabBarIcon: tabIcon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}
