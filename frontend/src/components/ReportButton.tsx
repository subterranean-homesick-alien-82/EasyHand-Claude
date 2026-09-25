import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, type ReportReason, type ReportTarget } from '@/lib/api';
import { colors, radius, spacing, TAP_TARGET } from '@/theme';

import { Button, ErrorText, Field } from './ui';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'scam', label: 'Looks like a scam' },
  { value: 'unsafe', label: 'I felt unsafe' },
  { value: 'offensive', label: 'Rude or offensive' },
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'other', label: 'Something else' },
];

/** A low-key "Report" link that opens a simple, step-by-step report form. */
export function ReportButton({ targetType, targetId, label }: { targetType: ReportTarget; targetId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setReason(null);
    setDetails('');
    setDone(false);
    setError(null);
  };

  const submit = async () => {
    if (!reason) return setError('Please choose a reason.');
    setBusy(true);
    setError(null);
    try {
      await api.report({ target_type: targetType, target_id: targetId, reason, details: details.trim() });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.trigger}>
        <Ionicons name="flag-outline" size={20} color={colors.danger} />
        <Text style={styles.triggerText}>{label}</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
              {done ? (
                <>
                  <Text style={styles.title}>Thank you</Text>
                  <Text style={styles.body}>
                    We got your report and a person will look at it soon. If you are in danger, call 911.
                  </Text>
                  <Text style={styles.body}>
                    {targetType === 'user'
                      ? 'You can also block this person so they cannot message you.'
                      : 'You do not have to reply to anyone you are not comfortable with.'}
                  </Text>
                  <Button title="Close" onPress={close} />
                </>
              ) : (
                <>
                  <Text style={styles.title}>{label}</Text>
                  <Text style={styles.body}>What is wrong? Only EasyHand staff will see this.</Text>
                  {REASONS.map((r) => {
                    const selected = reason === r.value;
                    return (
                      <Pressable
                        key={r.value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() => setReason(r.value)}
                        style={[styles.option, selected && styles.optionSelected]}
                      >
                        <Ionicons
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={24}
                          color={selected ? colors.primary : colors.textMuted}
                        />
                        <Text style={styles.optionText}>{r.label}</Text>
                      </Pressable>
                    );
                  })}
                  <Field
                    label="Anything else we should know? (optional)"
                    value={details}
                    onChangeText={setDetails}
                    multiline
                    maxLength={1000}
                  />
                  <ErrorText message={error} />
                  <Button title="Send report" variant="danger" onPress={submit} loading={busy} />
                  <Button title="Cancel" variant="secondary" onPress={close} />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TAP_TARGET,
  },
  triggerText: { color: colors.danger, fontWeight: '700', fontSize: 17 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    maxHeight: '92%',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  body: { fontSize: 18, color: colors.text, lineHeight: 26 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TAP_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { fontSize: 18, color: colors.text, fontWeight: '600' },
});
