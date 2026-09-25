import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/AuthScreen';
import { Button, Checkbox, ErrorText, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 8) {
      setError('Your password needs at least 8 characters.');
      return;
    }
    if (!agreed) {
      setError('Please tick the box to confirm you are 18 or older and agree to the Terms.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await signUp({ name: name.trim(), neighborhood: neighborhood.trim(), email: email.trim(), password, accepted_terms: agreed });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthScreen subtitle="Join your neighborhood">
      <Field label="Your name" value={name} onChangeText={setName} autoComplete="name" />
      <Field label="Neighborhood" value={neighborhood} onChangeText={setNeighborhood} placeholder="e.g. Cooper-Young, Midtown" />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry hint="At least 8 characters" autoComplete="new-password" />
      <View style={{ gap: spacing.xs }}>
        <Checkbox checked={agreed} onChange={setAgreed}>
          <Text style={styles.agree}>I am 18 or older and I agree to the Terms of Service and Privacy Policy.</Text>
        </Checkbox>
        <Text style={styles.links}>
          Read the{' '}
          <Link href="/terms" style={styles.link}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" style={styles.link}>
            Privacy Policy
          </Link>
        </Text>
      </View>
      <ErrorText message={error} />
      <Button title="Create account" onPress={submit} loading={busy} disabled={!name || !email || !password} />
      <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 17, lineHeight: 26 }}>
        Already a member?{' '}
        <Link href="/login" style={{ color: colors.primary, fontWeight: '700' }}>
          Log in
        </Link>
      </Text>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  agree: { fontSize: 17, color: colors.text, lineHeight: 24 },
  links: { fontSize: 17, color: colors.textMuted, lineHeight: 26, marginLeft: 44 },
  link: { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
});
