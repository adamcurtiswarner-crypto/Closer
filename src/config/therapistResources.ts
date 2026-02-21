export type ResourceCategory = 'online_therapy' | 'crisis_support' | 'self_guided' | 'books';

export interface ResourceCategoryMeta {
  value: ResourceCategory;
  icon: string;
  label: string;
  description: string;
}

export interface TherapistResource {
  id: string;
  name: string;
  description: string;
  url: string;
  category: ResourceCategory;
  icon: string;
  isFree: boolean;
}

export const RESOURCE_CATEGORIES: ResourceCategoryMeta[] = [
  {
    value: 'crisis_support',
    icon: '\u2764\uFE0F',
    label: 'Crisis Support',
    description: 'Immediate help when you need it most',
  },
  {
    value: 'online_therapy',
    icon: '\uD83D\uDCAC',
    label: 'Online Therapy',
    description: 'Professional counseling from home',
  },
  {
    value: 'self_guided',
    icon: '\u2728',
    label: 'Self-Guided Tools',
    description: 'Activities and exercises for couples',
  },
  {
    value: 'books',
    icon: '\uD83D\uDCDA',
    label: 'Books',
    description: 'Recommended reading for deeper understanding',
  },
];

export const THERAPIST_RESOURCES: TherapistResource[] = [
  // Crisis Support
  {
    id: 'ndvh',
    name: 'National Domestic Violence Hotline',
    description: '24/7 confidential support for anyone affected by domestic violence. Call, text, or chat.',
    url: 'https://www.thehotline.org',
    category: 'crisis_support',
    icon: '\uD83D\uDCDE',
    isFree: true,
  },
  {
    id: 'crisis_text',
    name: 'Crisis Text Line',
    description: 'Text HOME to 741741 to connect with a trained crisis counselor.',
    url: 'https://www.crisistextline.org',
    category: 'crisis_support',
    icon: '\uD83D\uDCF1',
    isFree: true,
  },

  // Online Therapy
  {
    id: 'regain',
    name: 'ReGain',
    description: 'Online couples counseling with licensed therapists specializing in relationships.',
    url: 'https://www.regain.us',
    category: 'online_therapy',
    icon: '\uD83E\uDD1D',
    isFree: false,
  },
  {
    id: 'betterhelp',
    name: 'BetterHelp',
    description: 'Individual therapy that can help you work through relationship challenges.',
    url: 'https://www.betterhelp.com',
    category: 'online_therapy',
    icon: '\uD83D\uDDE8\uFE0F',
    isFree: false,
  },
  {
    id: 'talkspace',
    name: 'Talkspace',
    description: 'Couples therapy with licensed therapists via text, audio, or video.',
    url: 'https://www.talkspace.com',
    category: 'online_therapy',
    icon: '\uD83C\uDF10',
    isFree: false,
  },

  // Self-Guided
  {
    id: 'gottman_cards',
    name: 'Gottman Card Decks',
    description: 'Research-based conversation starters and relationship exercises.',
    url: 'https://www.gottman.com/couples/apps/',
    category: 'self_guided',
    icon: '\uD83C\uDCCF',
    isFree: true,
  },
  {
    id: 'prepare_enrich',
    name: 'PREPARE/ENRICH',
    description: 'Evidence-based assessment and exercises for couples at any stage.',
    url: 'https://www.prepare-enrich.com',
    category: 'self_guided',
    icon: '\uD83D\uDCCB',
    isFree: false,
  },

  // Books
  {
    id: 'seven_principles',
    name: 'The Seven Principles for Making Marriage Work',
    description: 'By John Gottman. The definitive guide based on decades of research.',
    url: 'https://www.gottman.com/product/the-seven-principles-for-making-marriage-work/',
    category: 'books',
    icon: '\uD83D\uDCD6',
    isFree: false,
  },
  {
    id: 'hold_me_tight',
    name: 'Hold Me Tight',
    description: 'By Sue Johnson. Seven conversations for a lifetime of love.',
    url: 'https://drsuejohnson.com/books/hold-me-tight/',
    category: 'books',
    icon: '\uD83D\uDCD7',
    isFree: false,
  },
  {
    id: 'attached',
    name: 'Attached',
    description: 'By Amir Levine & Rachel Heller. Understanding attachment styles in relationships.',
    url: 'https://www.attachedthebook.com',
    category: 'books',
    icon: '\uD83D\uDCD8',
    isFree: false,
  },
];

export function getResourcesByCategory(category: ResourceCategory): TherapistResource[] {
  return THERAPIST_RESOURCES.filter((r) => r.category === category);
}

export function getCategoryMeta(value: ResourceCategory): ResourceCategoryMeta | null {
  return RESOURCE_CATEGORIES.find((c) => c.value === value) ?? null;
}
