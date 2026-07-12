import {
  PROMPT_CATEGORIES,
  V1_PROMPT_CATEGORIES,
  getCategoryByType,
} from '@/config/promptCategories';
import { colors } from '@/config/theme';

// Palette law: coral + ink + warm + white, purple/green accents only.
// Category identity in v1 UI is carried by the icon — these fields exist
// for hidden screens and must stay pinned to sanctioned theme tokens.
const SANCTIONED_ACCENTS = [
  colors.accent.primary, // coral #D4522A
  colors.brand.purple,
  colors.brand.green,
];

const SANCTIONED_TINTS = [
  colors.accent.primaryLight,
  colors.brand.purpleLight,
  colors.brand.greenLight,
];

describe('promptCategories color discipline', () => {
  it('every category color is a sanctioned accent (coral/purple/green)', () => {
    for (const cat of PROMPT_CATEGORIES) {
      expect(SANCTIONED_ACCENTS).toContain(cat.color);
    }
  });

  it('every category bgColor is a sanctioned tint', () => {
    for (const cat of PROMPT_CATEGORIES) {
      expect(SANCTIONED_TINTS).toContain(cat.bgColor);
    }
  });

  it('purple/green accents are used sparingly (coral is the default)', () => {
    const nonCoral = V1_PROMPT_CATEGORIES.filter(
      (c) => c.color !== colors.accent.primary
    );
    expect(nonCoral.length).toBeLessThanOrEqual(2);
  });
});

describe('promptCategories taxonomy', () => {
  it('exposes 12 v1 categories (legacy excluded)', () => {
    expect(V1_PROMPT_CATEGORIES).toHaveLength(12);
    expect(V1_PROMPT_CATEGORIES.every((c) => !c.legacy)).toBe(true);
  });

  it('legacy types remain resolvable for existing prompts', () => {
    const legacyTypes = [
      'love_map_update',
      'bid_for_connection',
      'appreciation_expression',
      'dream_exploration',
      'conflict_navigation',
      'repair_attempt',
    ];
    for (const type of legacyTypes) {
      const cat = getCategoryByType(type);
      expect(cat).toBeDefined();
      expect(cat?.legacy).toBe(true);
    }
  });

  it('returns undefined for unknown types', () => {
    expect(getCategoryByType('nonexistent')).toBeUndefined();
  });
});

describe('legacy → v1 category aliases (Hearth tally homes)', () => {
  const { LEGACY_TO_V1_CATEGORY, toV1Category, V1_PROMPT_CATEGORIES } =
    require('../config/promptCategories');

  it('maps every legacy category to a real v1 tile', () => {
    const v1Ids = V1_PROMPT_CATEGORIES.map((c: { type: string }) => c.type);
    for (const target of Object.values(LEGACY_TO_V1_CATEGORY)) {
      expect(v1Ids).toContain(target);
    }
  });

  it('passes v1 ids through unchanged and aliases legacy ids', () => {
    expect(toV1Category('money')).toBe('money');
    expect(toV1Category('love_map_update')).toBe('communication');
    expect(toV1Category('dream_exploration')).toBe('future_dreams');
    expect(toV1Category('repair_attempt')).toBe('conflict_repair');
    expect(toV1Category('')).toBe('');
  });
});
