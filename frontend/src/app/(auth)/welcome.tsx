import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router } from 'expo-router';
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

const STEPS: { icon: ComponentProps<typeof Ionicons>['name']; title: string; text: string }[] = [
  {
    icon: 'create-outline',
    title: 'Post what you need',
    text: 'Setting up a phone, a deep clean, mowing the lawn. Or offer a skill you have.',
  },
  {
    icon: 'chatbubbles-outline',
    title: 'A neighbor messages you',
    text: 'People nearby who can help will send you a message right here.',
  },
  {
    icon: 'hand-left-outline',
    title: 'Agree on a time and price',
    text: 'You decide together. Payment is between you and your neighbor.',
  },
];

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brand}>
          <Text style={styles.logo} accessibilityElementsHidden importantForAccessibility="no">
            🤝
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            EasyHand
          </Text>
          <Text style={styles.tagline}>Neighbors helping neighbors in Memphis</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={styles.howTitle}>How it works</Text>
          {STEPS.map((step, i) => (
            <View key={step.title} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.stepTitleRow}>
                  <Ionicons name={step.icon} size={22} color={colors.primary} />
                  <Text style={styles.stepTitle}>{step.title}</Text>
                </View>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.md }}>
          <Button title="Join EasyHand. It's free" onPress={() => router.push('/register')} />
          <Button title="I already have an account" variant="secondary" onPress={() => router.push('/login')} />
          <Link href="/help" style={styles.helpLink}>
            Questions? Read Help & Safety
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brand: { alignItems: 'center', gap: spacing.xs },
  logo: { fontSize: 52 },
  title: { fontSize: 38, fontWeight: '800', color: colors.primaryDark },
  tagline: { color: colors.textMuted, fontSize: 19, textAlign: 'center' },
  howTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepTitle: { fontSize: 19, fontWeight: '700', color: colors.text, flexShrink: 1 },
  stepText: { fontSize: 17, color: colors.textMuted, lineHeight: 24 },
  helpLink: { textAlign: 'center', color: colors.primary, fontWeight: '700', fontSize: 17, paddingVertical: spacing.md },
});
