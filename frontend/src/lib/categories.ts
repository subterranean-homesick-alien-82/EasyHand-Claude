import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { Category, PostKind, PostStatus } from './api';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const CATEGORIES: { value: Category; label: string; icon: IconName; color: string }[] = [
  { value: 'tech', label: 'Tech Support', icon: 'laptop-outline', color: '#3B6FB6' },
  { value: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline', color: '#8A5CC2' },
  { value: 'lawncare', label: 'Lawncare', icon: 'leaf-outline', color: '#2F7D55' },
  { value: 'other', label: 'Odd Jobs', icon: 'construct-outline', color: '#B7722A' },
];

export function categoryInfo(value: Category) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

export const KIND_LABELS: Record<PostKind, string> = {
  request: 'Needs help',
  offer: 'Offering help',
};

export const STATUS_LABELS: Record<PostStatus, string> = {
  active: 'Active',
  claimed: 'Claimed',
  completed: 'Completed',
};
