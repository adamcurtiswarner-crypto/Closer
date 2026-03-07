import { IconName } from '@/components/Icon';

export interface PromptCategory {
  type: string;
  label: string;
  description: string;
  icon: IconName;
  color: string;
  bgColor: string;
}

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    type: 'love_map_update',
    label: 'Know Each Other',
    description: 'Deepen your understanding',
    icon: 'compass',
    color: '#ef5323',
    bgColor: '#fef7f4',
  },
  {
    type: 'bid_for_connection',
    label: 'Connect',
    description: 'Reach toward each other',
    icon: 'handshake',
    color: '#6b8e7b',
    bgColor: '#f0f7f3',
  },
  {
    type: 'appreciation_expression',
    label: 'Appreciate',
    description: 'Express gratitude',
    icon: 'heart',
    color: '#d4736e',
    bgColor: '#fdf2f2',
  },
  {
    type: 'dream_exploration',
    label: 'Dream Together',
    description: 'Explore your future',
    icon: 'sparkle',
    color: '#7b6b8e',
    bgColor: '#f5f2f7',
  },
  {
    type: 'conflict_navigation',
    label: 'Navigate',
    description: 'Work through friction',
    icon: 'compass',
    color: '#490f5f',
    bgColor: '#f7f4f0',
  },
  {
    type: 'repair_attempt',
    label: 'Repair',
    description: 'Reconnect after distance',
    icon: 'bandaids',
    color: '#5b8ea3',
    bgColor: '#f0f5f7',
  },
];

export function getCategoryByType(type: string): PromptCategory | undefined {
  return PROMPT_CATEGORIES.find((c) => c.type === type);
}
