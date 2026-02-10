export interface WishlistCategory {
  value: string;
  icon: string;
  label: string;
}

export const WISHLIST_CATEGORIES: WishlistCategory[] = [
  { value: 'experiences', icon: '\u2728', label: 'Experiences' },
  { value: 'travel', icon: '\u2708\uFE0F', label: 'Travel' },
  { value: 'food', icon: '\uD83C\uDF7D\uFE0F', label: 'Food & Dining' },
  { value: 'home', icon: '\uD83C\uDFE0', label: 'Home' },
  { value: 'gifts', icon: '\uD83C\uDF81', label: 'Gifts' },
  { value: 'other', icon: '\uD83D\uDCAB', label: 'Other' },
];

export function getCategoryDisplay(value: string): WishlistCategory | null {
  return WISHLIST_CATEGORIES.find((c) => c.value === value) ?? null;
}
