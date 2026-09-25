import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { Category, PostKind, PostStatus } from './api';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const CATEGORIES: { value: Category; label: string; icon: IconName; color: string }[] = [
  { value: 'tech', label: 'Tech Support', icon: 'laptop-outline', color: '#325F9E' },
  { value: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline', color: '#7A4FB0' },
  { value: 'lawncare', label: 'Lawncare', icon: 'leaf-outline', color: '#276B48' },
  { value: 'other', label: 'Odd Jobs', icon: 'construct-outline', color: '#94591C' },
];

export function categoryInfo(value: Category) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

export const KIND_LABELS: Record<PostKind, string> = {
  request: 'Needs a hand',
  offer: 'Offering a hand',
};

export const STATUS_LABELS: Record<PostStatus, string> = {
  active: 'Active',
  claimed: 'Someone is helping',
  completed: 'Done',
};
