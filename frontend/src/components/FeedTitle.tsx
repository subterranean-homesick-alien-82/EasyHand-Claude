import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors } from '@/theme';

/** The greeting, heading and subtitle shown above a listings feed. */
export function FeedTitle({ greeting, title, subtitle }: { greeting: ReactNode; title: string; subtitle: ReactNode }) {
  return (
    <>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  greeting: { color: colors.textMuted, fontSize: 17 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 17 },
});
