import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AuthScreen } from '@/components/AuthScreen';
import { Button, ErrorText, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthScreen subtitle="Welcome back">
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={submit} />
      <ErrorText message={error} />
      <Button title="Log in" onPress={submit} loading={busy} disabled={!email || !password} />
      <Text style={{ textAlign: 'center', color: colors.textMuted }}>
        New to EasyHand?{' '}
        <Link href="/register" style={{ color: colors.primary, fontWeight: '700' }}>
          Create an account
        </Link>
      </Text>
    </AuthScreen>
  );
}
