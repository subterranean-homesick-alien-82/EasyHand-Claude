import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { colors, spacing } from '@/theme';

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is EasyHand?',
    a: 'A free community board for Memphis neighbors. Post when you need a hand with tech, cleaning, yard work or odd jobs, or offer help with something you are good at.',
  },
  {
    q: 'How do I ask for help?',
    a: 'Tap “Post” at the bottom of the screen, choose “I need a hand”, describe what you need, and tap “Post it”. Neighbors who can help will message you.',
  },
  {
    q: 'How do I reply to a neighbor?',
    a: 'Tap “Messages” at the bottom of the screen, then tap their name. Type in the box at the bottom and tap the green arrow to send.',
  },
  {
    q: 'How does payment work?',
    a: 'You and your neighbor agree on a price in your messages and pay each other directly, for example with cash. EasyHand does not handle money or charge any fees.',
  },
  {
    q: 'Does EasyHand check the people who sign up?',
    a: 'No. EasyHand connects neighbors but does not employ, screen or background-check anyone. Please use the safety tips below and trust your instincts.',
  },
];

const SAFETY_TIPS = [
  'Chat in EasyHand first, and meet in daylight when you can.',
  'Tell a friend or family member who is coming and when.',
  'Never pay the full amount before the work is done.',
  'Never share bank details, passwords or codes sent to your phone.',
  'If anything feels wrong, stop and say no. You never owe anyone a job.',
  'In an emergency, call 911.',
];

export default function HelpScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading} accessibilityRole="header">
        Staying safe
      </Text>
      <Card style={{ gap: spacing.md }}>
        {SAFETY_TIPS.map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.tip}>{tip}</Text>
          </View>
        ))}
      </Card>

      <Text style={styles.heading} accessibilityRole="header">
        Common questions
      </Text>
      {FAQ.map((item) => (
        <Card key={item.q} style={{ gap: spacing.xs }}>
          <Text style={styles.question}>{item.q}</Text>
          <Text style={styles.answer}>{item.a}</Text>
        </Card>
      ))}

      {SUPPORT_EMAIL ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Text style={styles.heading} accessibilityRole="header">
            Still need help?
          </Text>
          <Text style={styles.answer}>Email us at {SUPPORT_EMAIL} and a real person will get back to you.</Text>
          <Button title="Email EasyHand" variant="secondary" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  tipRow: { flexDirection: 'row', gap: spacing.sm },
  bullet: { fontSize: 20, color: colors.primary, lineHeight: 26 },
  tip: { flex: 1, fontSize: 18, color: colors.text, lineHeight: 26 },
  question: { fontSize: 19, fontWeight: '700', color: colors.text },
  answer: { fontSize: 18, color: colors.textMuted, lineHeight: 26 },
});
