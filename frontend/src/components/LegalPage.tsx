import { ScrollView, StyleSheet, Text } from 'react-native';

import { colors, spacing } from '@/theme';

export interface LegalSection {
  heading: string;
  body: string;
}

export function LegalPage({ updated, intro, sections }: { updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.updated}>Last updated {updated}</Text>
      <Text style={styles.body}>{intro}</Text>
      {sections.map((s) => (
        <Text key={s.heading} style={styles.body}>
          <Text style={styles.heading}>{s.heading}{'\n'}</Text>
          {s.body}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  updated: { color: colors.textMuted, fontSize: 16 },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text },
  body: { fontSize: 18, color: colors.text, lineHeight: 27 },
});
