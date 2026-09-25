import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, TAP_TARGET } from '@/theme';

export function AuthScreen({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
            style={styles.back}
          >
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.brand}>
            <Text style={styles.title}>EasyHand</Text>
          </View>
          <Text style={styles.subtitle} accessibilityRole="header">
            {subtitle}
          </Text>
          <View style={{ gap: spacing.lg }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: TAP_TARGET, alignSelf: 'flex-start' },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 18 },
  brand: { alignItems: 'center' },
  title: { fontSize: 34, fontWeight: '800', color: colors.primaryDark },
  subtitle: { fontSize: 24, fontWeight: '800', color: colors.text },
});
