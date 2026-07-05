import { IconName } from '@/components/Icon';

export interface PromptCategory {
  type: string;
  label: string;
  description: string;
  icon: IconName;
  color: string;
  bgColor: string;
  // True for the pre-v1 taxonomy. 362 legacy prompts still reference these
  // types, so they must stay resolvable via getCategoryByType.
  legacy?: boolean;
}

export const PROMPT_CATEGORIES: PromptCategory[] = [
  // ============================================
  // LEGACY TAXONOMY (pre-v1) — do not remove;
  // existing prompts reference these type ids
  // ============================================
  {
    type: 'love_map_update',
    label: 'Know Each Other',
    description: 'Deepen your understanding',
    icon: 'compass',
    color: '#D4522A',
    bgColor: '#F5F2EE',
    legacy: true,
  },
  {
    type: 'bid_for_connection',
    label: 'Connect',
    description: 'Reach toward each other',
    icon: 'handshake',
    color: '#6b8e7b',
    bgColor: '#f0f7f3',
    legacy: true,
  },
  {
    type: 'appreciation_expression',
    label: 'Appreciate',
    description: 'Express gratitude',
    icon: 'heart',
    color: '#d4736e',
    bgColor: '#fdf2f2',
    legacy: true,
  },
  {
    type: 'dream_exploration',
    label: 'Dream Together',
    description: 'Explore your future',
    icon: 'sparkle',
    color: '#7b6b8e',
    bgColor: '#f5f2f7',
    legacy: true,
  },
  {
    type: 'conflict_navigation',
    label: 'Navigate',
    description: 'Work through friction',
    icon: 'compass',
    color: '#3D2870',
    bgColor: '#f7f4f0',
    legacy: true,
  },
  {
    type: 'repair_attempt',
    label: 'Repair',
    description: 'Reconnect after distance',
    icon: 'bandaids',
    color: '#5b8ea3',
    bgColor: '#f0f5f7',
    legacy: true,
  },

  // ============================================
  // V1 TAXONOMY — 12 categories for scored
  // prompts and score-triggered follow-ups
  // ============================================
  {
    type: 'communication',
    label: 'Communication',
    description: 'How you talk, listen, and land with each other',
    icon: 'chat-circle',
    color: '#5b8ea3',
    bgColor: '#f0f5f7',
  },
  {
    type: 'intimacy',
    label: 'Intimacy',
    description: 'Physical closeness, desire, and being wanted',
    icon: 'flame',
    color: '#D4522A',
    bgColor: '#fdf1ec',
  },
  {
    type: 'affection',
    label: 'Affection',
    description: "The small daily gestures that say you're noticed",
    icon: 'heart',
    color: '#d4736e',
    bgColor: '#fdf2f2',
  },
  {
    type: 'money',
    label: 'Money',
    description: 'Spending, saving, fairness, and money stress',
    icon: 'coins',
    color: '#8b7355',
    bgColor: '#f7f4f0',
  },
  {
    type: 'family',
    label: 'Family',
    description: 'The people you each came with',
    icon: 'house-simple',
    color: '#c98a54',
    bgColor: '#fdf6ef',
  },
  {
    type: 'friends',
    label: 'Friends',
    description: 'Your life with people outside the two of you',
    icon: 'users',
    color: '#6b8e7b',
    bgColor: '#f0f7f3',
  },
  {
    type: 'fun_play',
    label: 'Fun and play',
    description: 'Laughing together, novelty, lightness',
    icon: 'game-controller',
    color: '#c49a4a',
    bgColor: '#faf6ec',
  },
  {
    type: 'future_dreams',
    label: 'Future dreams',
    description: "Where you're headed, together and separately",
    icon: 'path',
    color: '#7b6b8e',
    bgColor: '#f5f2f7',
  },
  {
    type: 'everyday_life',
    label: 'Everyday life',
    description: 'Chores, logistics, and the invisible work',
    icon: 'coffee',
    color: '#96705b',
    bgColor: '#f9f3f0',
  },
  {
    type: 'conflict_repair',
    label: 'Conflict and repair',
    description: 'How you fight and how you find your way back',
    icon: 'bandaids',
    color: '#a35b5b',
    bgColor: '#f9f0f0',
  },
  {
    type: 'appreciation_trust',
    label: 'Appreciation and trust',
    description: 'Feeling valued, relied on, and safe',
    icon: 'handshake',
    color: '#5b9a8e',
    bgColor: '#eff7f5',
  },
  {
    type: 'growth_independence',
    label: 'Growth and independence',
    description: 'Staying whole people inside the couple',
    icon: 'plant',
    color: '#7b8e6b',
    bgColor: '#f4f7f0',
  },
];

// The v1 taxonomy only (excludes legacy categories)
export const V1_PROMPT_CATEGORIES: PromptCategory[] = PROMPT_CATEGORIES.filter(
  (c) => !c.legacy
);

export function getCategoryByType(type: string): PromptCategory | undefined {
  return PROMPT_CATEGORIES.find((c) => c.type === type);
}
