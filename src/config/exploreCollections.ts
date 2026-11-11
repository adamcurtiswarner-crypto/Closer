import type { IconName } from '@/components/Icon';
import { colors } from '@/config/theme';

export interface ExploreCollection {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  color: string;
  /** Number of prompts in this collection (set at runtime from data). */
  count?: number;
}

export const EXPLORE_COLLECTIONS: ExploreCollection[] = [
  {
    id: 'get_to_know_you',
    label: 'Get to Know You',
    description: 'Discovery, curiosity, learning your person',
    icon: 'compass',
    color: colors.accent.primary,
  },
  {
    id: 'love_and_appreciation',
    label: 'Love and Appreciation',
    description: 'Gratitude, affection, being seen',
    icon: 'heart',
    color: colors.accent.primary,
  },
  {
    id: 'talk_it_through',
    label: 'Talk It Through',
    description: 'Hard conversations, repairs, finding your way back',
    icon: 'chat-circle',
    color: colors.accent.primary,
  },
  {
    id: 'dream_together',
    label: 'Dream Together',
    description: 'Future, goals, shared vision',
    icon: 'path',
    color: colors.brand.purple,
  },
  {
    id: 'life_together',
    label: 'Life Together',
    description: 'Money, family, daily logistics, friendships',
    icon: 'coffee',
    color: colors.accent.primary,
  },
  {
    id: 'fun_and_play',
    label: 'Fun and Play',
    description: 'Lightness, humor, novelty, adventure',
    icon: 'game-controller',
    color: colors.brand.green,
  },
];

export function getCollectionById(id: string): ExploreCollection | undefined {
  return EXPLORE_COLLECTIONS.find((c) => c.id === id);
}
