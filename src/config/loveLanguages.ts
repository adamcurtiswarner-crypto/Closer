export interface LoveLanguageDefinition {
  value: string;
  icon: string;
  label: string;
  description: string;
}

export const LOVE_LANGUAGES: LoveLanguageDefinition[] = [
  {
    value: 'words_of_affirmation',
    icon: '\uD83D\uDCAC',
    label: 'Words of Affirmation',
    description: 'Verbal compliments, encouragement, and "I love you"',
  },
  {
    value: 'quality_time',
    icon: '\u23F0',
    label: 'Quality Time',
    description: 'Undivided attention and being fully present',
  },
  {
    value: 'receiving_gifts',
    icon: '\uD83C\uDF81',
    label: 'Receiving Gifts',
    description: 'Thoughtful presents and symbols of love',
  },
  {
    value: 'acts_of_service',
    icon: '\uD83E\uDD32',
    label: 'Acts of Service',
    description: 'Helpful actions that ease your partner\'s load',
  },
  {
    value: 'physical_touch',
    icon: '\uD83E\uDEC2',
    label: 'Physical Touch',
    description: 'Hugs, holding hands, and physical closeness',
  },
];

export function getLoveLanguageDisplay(value: string | null): LoveLanguageDefinition | null {
  if (!value) return null;
  return LOVE_LANGUAGES.find((l) => l.value === value) || null;
}
