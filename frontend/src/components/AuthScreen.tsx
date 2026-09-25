import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

export function AuthScreen({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.logo}>🤝</Text>
            <Text style={styles.title}>EasyHand</Text>
            <Text style={styles.tagline}>Neighbors helping neighbors in Memphis</Text>
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={{ gap: spacing.lg }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl, maxWidth: 480, width: '100%', alignSelf: 'center' },
  brand: { alignItems: 'center', gap: spacing.xs },
  logo: { fontSize: 44 },
  title: { fontSize: 32, fontWeight: '800', color: colors.primaryDark },
  tagline: { color: colors.textMuted, fontSize: 15 },
  subtitle: { fontSize: 20, fontWeight: '700', color: colors.text },
});
