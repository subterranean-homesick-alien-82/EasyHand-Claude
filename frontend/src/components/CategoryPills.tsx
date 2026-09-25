import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { Category } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { colors, radius, spacing } from '@/theme';

/** Horizontal category filter. `null` means "All" (only shown when `includeAll` is set). */
export function CategoryPills({
  value,
  onChange,
  includeAll = false,
}: {
  value: Category | null;
  onChange: (value: Category | null) => void;
  includeAll?: boolean;
}) {
  const options = [
    ...(includeAll ? [{ value: null, label: 'All', icon: 'apps-outline' as const, color: colors.text }] : []),
    ...CATEGORIES,
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={[styles.pill, selected && { backgroundColor: opt.color, borderColor: opt.color }]}
          >
            <Ionicons name={opt.icon} size={16} color={selected ? '#fff' : opt.color} />
            <Text style={[styles.label, selected && { color: '#fff' }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: { fontWeight: '600', color: colors.text },
});
