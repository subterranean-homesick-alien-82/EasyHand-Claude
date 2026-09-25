import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Tag } from './ui';

const SUGGESTIONS = ['Tech Coach', 'Lawn Care Enthusiast', 'Home Organizer', 'Deep Cleaning', 'Wi-Fi Wizard', 'Handy with Tools'];

export function SkillsEditor({ value, onChange }: { value: string[]; onChange: (skills: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const has = (s: string) => value.some((v) => v.toLowerCase() === s.toLowerCase());

  const add = (raw: string) => {
    const skill = raw.trim();
    if (skill && !has(skill)) onChange([...value, skill]);
    setDraft('');
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>Skills & interests</Text>
      <View style={styles.tags}>
        {value.map((s) => (
          <Tag key={s} label={s} removable onPress={() => onChange(value.filter((v) => v !== s))} />
        ))}
      </View>
      <TextInput
        value={draft}
        onChangeText={(text) => (text.endsWith(',') ? add(text.slice(0, -1)) : setDraft(text))}
        onSubmitEditing={() => add(draft)}
        placeholder="Type a skill and press enter"
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        submitBehavior="submit"
        style={styles.input}
      />
      <View style={styles.tags}>
        {SUGGESTIONS.filter((s) => !has(s)).map((s) => (
          <Tag key={s} label={`+ ${s}`} color={colors.textMuted} onPress={() => add(s)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '600', color: colors.text, fontSize: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
});
