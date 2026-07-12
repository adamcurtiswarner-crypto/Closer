import { IconName } from '@/components/Icon';
import { colors } from '@/config/theme';

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
  // existing prompts reference these type ids.
  // Colors pinned to sanctioned theme tokens (see
  // v1 color-discipline note below) — the old
  // per-category pastels are gone on purpose.
  // ============================================
  {
    type: 'love_map_update',
    label: 'Know Each Other',
    description: 'Deepen your understanding',
    icon: 'compass',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
    legacy: true,
  },
  {
    type: 'bid_for_connection',
    label: 'Connect',
    description: 'Reach toward each other',
    icon: 'handshake',
    color: colors.brand.green,
    bgColor: colors.brand.greenLight,
    legacy: true,
  },
  {
    type: 'appreciation_expression',
    label: 'Appreciate',
    description: 'Express gratitude',
    icon: 'heart',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
    legacy: true,
  },
  {
    type: 'dream_exploration',
    label: 'Dream Together',
    description: 'Explore your future',
    icon: 'sparkle',
    color: colors.brand.purple,
    bgColor: colors.brand.purpleLight,
    legacy: true,
  },
  {
    type: 'conflict_navigation',
    label: 'Navigate',
    description: 'Work through friction',
    icon: 'compass',
    color: colors.brand.purple,
    bgColor: colors.brand.purpleLight,
    legacy: true,
  },
  {
    type: 'repair_attempt',
    label: 'Repair',
    description: 'Reconnect after distance',
    icon: 'bandaids',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
    legacy: true,
  },

  // ============================================
  // V1 TAXONOMY — 12 categories for scored
  // prompts and score-triggered follow-ups
  //
  // Color discipline (v1): the visible v1 UI (explore.tsx,
  // ExploreCategoryRow) must NOT consume color/bgColor — category
  // identity is carried by the icon, and chips/cards use the shared
  // coral/warm treatment from theme tokens. The fields stay on the
  // type because hidden (feature-flagged) screens still read them,
  // so every v1 entry is pinned to sanctioned theme tokens
  // (coral primary; purple/green brand accents used sparingly)
  // to guarantee nothing off-palette can leak.
  // ============================================
  {
    type: 'communication',
    label: 'Communication',
    description: 'How you talk, listen, and land with each other',
    icon: 'chat-circle',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
  },
  {
    type: 'intimacy',
    label: 'Intimacy',
    description: 'Physical closeness, desire, and being wanted',
    icon: 'flame',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
  },
  {
    type: 'affection',
    label: 'Affection',
    description: "The small daily gestures that say you're noticed",
    icon: 'heart',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
  },
  {
    type: 'money',
    label: 'Money',
    description: 'Spending, saving, fairness, and money stress',
    icon: 'coins',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
  },
  {
    type: 'family',
    label: 'Family',
    description: 'The people you each came with',
    icon: 'house-simple',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
  },
  {
    type: 'friends',
    label: 'Friends',
    description: 'Your life with people outside the two of you',
    icon: 'users',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
  },
  {
    type: 'fun_play',
    label: 'Fun and play',
    description: 'Laughing together, novelty, lightness',
    icon: 'game-controller',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
  },
  {
    type: 'future_dreams',
    label: 'Future dreams',
    description: "Where you're headed, together and separately",
    icon: 'path',
    color: colors.brand.purple,
    bgColor: colors.brand.purpleLight,
  },
  {
    type: 'everyday_life',
    label: 'Everyday life',
    description: 'Chores, logistics, and the invisible work',
    icon: 'coffee',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
  },
  {
    type: 'conflict_repair',
    label: 'Conflict and repair',
    description: 'How you fight and how you find your way back',
    icon: 'bandaids',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
  },
  {
    type: 'appreciation_trust',
    label: 'Appreciation and trust',
    description: 'Feeling valued, relied on, and safe',
    icon: 'handshake',
    color: colors.accent.primary,
    bgColor: colors.accent.primaryLight,
  },
  {
    type: 'growth_independence',
    label: 'Growth and independence',
    description: 'Staying whole people inside the couple',
    icon: 'plant',
    color: colors.brand.green,
    bgColor: colors.brand.greenLight,
  },
];

// The v1 taxonomy only (excludes legacy categories)
export const V1_PROMPT_CATEGORIES: PromptCategory[] = PROMPT_CATEGORIES.filter(
  (c) => !c.legacy
);

// Legacy taxonomy → v1 tile aliases. Pre-v1 prompts and old explore
// assignments carry legacy type ids; Hearth tallies by the 12 v1
// categories, so every legacy id maps to its nearest v1 home. Applied at
// the Hearth read boundary AND when new assignments are written.
export const LEGACY_TO_V1_CATEGORY: Record<string, string> = {
  love_map_update: 'communication',
  bid_for_connection: 'affection',
  appreciation_expression: 'appreciation_trust',
  dream_exploration: 'future_dreams',
  conflict_navigation: 'conflict_repair',
  repair_attempt: 'conflict_repair',
};

/** Resolve any category id (legacy or v1) to its v1 tile id. */
export function toV1Category(type: string): string {
  return LEGACY_TO_V1_CATEGORY[type] ?? type;
}

export function getCategoryByType(type: string): PromptCategory | undefined {
  return PROMPT_CATEGORIES.find((c) => c.type === type);
}
