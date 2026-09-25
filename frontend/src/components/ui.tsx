import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { initials } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        pressed && { opacity: 0.85 },
        inactive && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#fff'} />
      ) : (
        <View style={styles.buttonContent}>
          {icon}
          <Text style={[styles.buttonText, variant === 'secondary' && { color: colors.primary }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[styles.input, props.multiline && styles.inputMultiline, props.style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials(name) || '?'}</Text>
    </View>
  );
}

export function Tag({
  label,
  color = colors.primary,
  onPress,
  removable,
}: {
  label: string;
  color?: string;
  onPress?: () => void;
  removable?: boolean;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={removable ? `Remove ${label}` : label}
      style={[styles.tag, { backgroundColor: `${color}1A` }]}
    >
      <Text style={[styles.tagText, { color }]}>
        {label}
        {removable ? '  ×' : ''}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Centered({ children }: { children: ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  return message ? <Text style={styles.error}>{message}</Text> : null;
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonSecondary: { backgroundColor: colors.primarySoft },
  buttonDanger: { backgroundColor: colors.danger },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { fontWeight: '600', color: colors.text, fontSize: 14 },
  hint: { color: colors.textMuted, fontSize: 12 },
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
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
  avatar: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primaryDark, fontWeight: '700' },
  tag: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  tagText: { fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyMessage: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  error: { color: colors.danger, fontWeight: '500' },
});
