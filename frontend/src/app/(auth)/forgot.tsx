import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AuthScreen } from '@/components/AuthScreen';
import { Button, Card, ErrorText, Field } from '@/components/ui';
import { api } from '@/lib/api';
import { colors } from '@/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen subtitle="Forgot your password?">
      {sent ? (
        <Card>
          <Text style={styles.body}>
            Check your email. If an account uses {email.trim()}, we’ve sent a link to choose a new password.
          </Text>
          <Text style={[styles.body, { marginTop: 12 }]}>
            The link works for 1 hour. If you don’t see the email in a few minutes, check your spam or junk folder.
          </Text>
        </Card>
      ) : (
        <>
          <Text style={styles.body}>Enter the email you signed up with and we’ll send you a link to choose a new password.</Text>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            onSubmitEditing={submit}
          />
          <ErrorText message={error} />
          <Button title="Email me a link" onPress={submit} loading={busy} disabled={!email.trim()} />
        </>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 18, color: colors.text, lineHeight: 26 },
});
