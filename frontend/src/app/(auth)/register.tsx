import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AuthScreen } from '@/components/AuthScreen';
import { Button, ErrorText, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await signUp({ name: name.trim(), neighborhood: neighborhood.trim(), email: email.trim(), password });
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
      <ErrorText message={error} />
      <Button title="Create account" onPress={submit} loading={busy} disabled={!name || !email || !password} />
      <Text style={{ textAlign: 'center', color: colors.textMuted }}>
        Already a member?{' '}
        <Link href="/login" style={{ color: colors.primary, fontWeight: '700' }}>
          Log in
        </Link>
      </Text>
    </AuthScreen>
  );
}
