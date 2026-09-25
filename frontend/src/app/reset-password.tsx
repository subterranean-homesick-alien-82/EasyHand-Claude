import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button, ErrorText, Field } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';

/** Opened from the link in the password-reset email. Works whether or not someone is signed in. */
export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { completeAuth } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 8) return setError('Your password needs at least 8 characters.');
    if (password !== confirm) return setError('The two passwords don’t match. Please type them again.');
    setError(null);
    setBusy(true);
    try {
      await completeAuth(await api.resetPassword(token ?? '', password));
      router.replace('/');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.body}>This link is missing some information. Please open the link from your email again.</Text>
        <Link href="/forgot" style={styles.link}>
          Send me a new link
        </Link>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.body}>Choose a new password. You’ll use it the next time you log in.</Text>
      <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry hint="At least 8 characters" autoComplete="new-password" />
      <Field label="Type it again" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" onSubmitEditing={submit} />
      <ErrorText message={error} />
      <Button title="Save new password" onPress={submit} loading={busy} disabled={!password || !confirm} />
      {error?.includes('expired') ? (
        <Link href="/forgot" style={styles.link}>
          Send me a new link
        </Link>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  body: { fontSize: 18, color: colors.text, lineHeight: 26 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 18 },
});
