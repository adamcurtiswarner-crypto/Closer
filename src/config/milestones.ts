import type { IconName } from '@/components/Icon';

export type BadgeTier = 'seed' | 'bloom' | 'flame' | 'keeper';
export type BadgeCategory = 'conversations' | 'showing_up' | 'time_together' | 'date_nights' | 'wishes' | 'reflections';

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  category: BadgeCategory;
  tier: BadgeTier;
  icon: IconName;
  iconWeight: 'light' | 'regular' | 'bold' | 'fill';
  threshold: number;
  field: keyof BadgeCheckData;
}

export interface BadgeCheckData {
  totalCompletions: number;
  longestStreak: number;
  daysAsCouple: number;
  memoriesSaved: number;
  dateNightsCompleted: number;
  wishlistItemsFulfilled: number;
  checkInsCompleted: number;
}

export const BADGES: BadgeDefinition[] = [
  // Conversations (prompts completed)
  { id: 'first_words', title: 'First Words', description: 'You started talking', category: 'conversations', tier: 'bloom', icon: 'sparkle', iconWeight: 'light', threshold: 1, field: 'totalCompletions' },
  { id: 'finding_rhythm', title: 'Finding a Rhythm', description: '25 conversations deep', category: 'conversations', tier: 'bloom', icon: 'sparkle', iconWeight: 'regular', threshold: 25, field: 'totalCompletions' },
  { id: 'open_book', title: 'Open Book', description: 'You keep showing up', category: 'conversations', tier: 'bloom', icon: 'star', iconWeight: 'fill', threshold: 75, field: 'totalCompletions' },
  { id: 'deeply_known', title: 'Deeply Known', description: '150 moments of honesty', category: 'conversations', tier: 'bloom', icon: 'heart', iconWeight: 'fill', threshold: 150, field: 'totalCompletions' },
  { id: 'unwritten_language', title: 'Unwritten Language', description: 'You speak fluently now', category: 'conversations', tier: 'bloom', icon: 'heart', iconWeight: 'fill', threshold: 300, field: 'totalCompletions' },

  // Showing Up (streak milestones)
  { id: 'side_by_side', title: 'Side by Side', description: 'Three days running', category: 'showing_up', tier: 'flame', icon: 'flame', iconWeight: 'light', threshold: 3, field: 'longestStreak' },
  { id: 'week_of_us', title: 'Week of Us', description: 'A full week together', category: 'showing_up', tier: 'flame', icon: 'flame', iconWeight: 'regular', threshold: 7, field: 'longestStreak' },
  { id: 'steady_ground', title: 'Steady Ground', description: 'Three weeks, no break', category: 'showing_up', tier: 'flame', icon: 'flame', iconWeight: 'bold', threshold: 21, field: 'longestStreak' },
  { id: 'daily_ritual', title: 'Daily Ritual', description: 'This is who you are now', category: 'showing_up', tier: 'flame', icon: 'flame', iconWeight: 'fill', threshold: 45, field: 'longestStreak' },
  { id: 'unbroken', title: 'Unbroken', description: 'Ninety days of showing up', category: 'showing_up', tier: 'flame', icon: 'flame', iconWeight: 'fill', threshold: 90, field: 'longestStreak' },

  // Time Together (days as couple)
  { id: 'just_arrived', title: 'Just Arrived', description: 'Your first week', category: 'time_together', tier: 'seed', icon: 'house-simple', iconWeight: 'light', threshold: 7, field: 'daysAsCouple' },
  { id: 'settling_in', title: 'Settling In', description: 'A month of this', category: 'time_together', tier: 'seed', icon: 'house-simple', iconWeight: 'regular', threshold: 30, field: 'daysAsCouple' },
  { id: 'taking_root', title: 'Taking Root', description: 'A full season together', category: 'time_together', tier: 'seed', icon: 'house-simple', iconWeight: 'bold', threshold: 90, field: 'daysAsCouple' },
  { id: 'half_a_year', title: 'Half a Year', description: 'Still here, still growing', category: 'time_together', tier: 'seed', icon: 'heart', iconWeight: 'regular', threshold: 180, field: 'daysAsCouple' },
  { id: 'one_full_year', title: 'One Full Year', description: 'A year of choosing this', category: 'time_together', tier: 'seed', icon: 'heart', iconWeight: 'fill', threshold: 365, field: 'daysAsCouple' },

  // Date Nights
  { id: 'first_night_out', title: 'First Night Out', description: 'You made it happen', category: 'date_nights', tier: 'bloom', icon: 'coffee', iconWeight: 'light', threshold: 1, field: 'dateNightsCompleted' },
  { id: 'regular_thing', title: 'Regular Thing', description: 'Five nights, just for you two', category: 'date_nights', tier: 'bloom', icon: 'coffee', iconWeight: 'regular', threshold: 5, field: 'dateNightsCompleted' },
  { id: 'standing_date', title: 'Standing Date', description: 'This is your thing now', category: 'date_nights', tier: 'bloom', icon: 'coffee', iconWeight: 'fill', threshold: 12, field: 'dateNightsCompleted' },
  { id: 'night_owls', title: 'Night Owls', description: 'Twenty-five nights and counting', category: 'date_nights', tier: 'bloom', icon: 'coffee', iconWeight: 'fill', threshold: 25, field: 'dateNightsCompleted' },

  // Wishes (wishlist items fulfilled)
  { id: 'first_wish', title: 'First Wish Granted', description: 'You were listening', category: 'wishes', tier: 'keeper', icon: 'gift', iconWeight: 'light', threshold: 1, field: 'wishlistItemsFulfilled' },
  { id: 'thoughtful', title: 'Thoughtful', description: 'Five wishes, five smiles', category: 'wishes', tier: 'keeper', icon: 'gift', iconWeight: 'regular', threshold: 5, field: 'wishlistItemsFulfilled' },
  { id: 'wish_keeper', title: 'Wish Keeper', description: 'You pay attention', category: 'wishes', tier: 'keeper', icon: 'gift', iconWeight: 'bold', threshold: 15, field: 'wishlistItemsFulfilled' },
  { id: 'dream_weaver', title: 'Dream Weaver', description: 'Thirty wishes made real', category: 'wishes', tier: 'keeper', icon: 'gift', iconWeight: 'fill', threshold: 30, field: 'wishlistItemsFulfilled' },

  // Reflections (check-ins)
  { id: 'first_look_inward', title: 'First Look Inward', description: 'You checked in', category: 'reflections', tier: 'seed', icon: 'note', iconWeight: 'light', threshold: 1, field: 'checkInsCompleted' },
  { id: 'monthly_mirror', title: 'Monthly Mirror', description: 'A month of reflection', category: 'reflections', tier: 'seed', icon: 'note', iconWeight: 'regular', threshold: 4, field: 'checkInsCompleted' },
  { id: 'quarterly_view', title: 'Quarterly View', description: 'Three months of honest check-ins', category: 'reflections', tier: 'seed', icon: 'note', iconWeight: 'bold', threshold: 12, field: 'checkInsCompleted' },
  { id: 'year_in_review', title: 'Year in Review', description: 'A year of paying attention', category: 'reflections', tier: 'seed', icon: 'note', iconWeight: 'fill', threshold: 48, field: 'checkInsCompleted' },
];

export interface BadgeStatus {
  earned: (BadgeDefinition & { progress: number })[];
  locked: (BadgeDefinition & { progress: number })[];
  next: (BadgeDefinition & { current: number }) | null;
}

export function getBadgeStatus(data: BadgeCheckData): BadgeStatus {
  const earned: (BadgeDefinition & { progress: number })[] = [];
  const locked: (BadgeDefinition & { progress: number })[] = [];
  let next: (BadgeDefinition & { current: number }) | null = null;

  for (const badge of BADGES) {
    const current = data[badge.field];
    const progress = Math.min(current / badge.threshold, 1);

    if (current >= badge.threshold) {
      earned.push({ ...badge, progress: 1 });
    } else {
      locked.push({ ...badge, progress });
      if (!next) {
        next = { ...badge, current };
      }
    }
  }

  return { earned, locked, next };
}

export function getAnniversaryCountdown(anniversaryDate: Date): { days: number; isToday: boolean; isThisWeek: boolean } {
  const now = new Date();
  const thisYear = now.getFullYear();

  // Next occurrence of the anniversary
  let nextAnniversary = new Date(thisYear, anniversaryDate.getMonth(), anniversaryDate.getDate());
  if (nextAnniversary < now) {
    // If this year's has passed, use next year
    nextAnniversary = new Date(thisYear + 1, anniversaryDate.getMonth(), anniversaryDate.getDate());
  }

  const diffMs = nextAnniversary.getTime() - now.getTime();
  const days = Math.ceil(diffMs / 86400000);
  const isToday = days === 0 || (now.getMonth() === anniversaryDate.getMonth() && now.getDate() === anniversaryDate.getDate());
  const isThisWeek = days <= 7 && days >= 0;

  return { days: isToday ? 0 : days, isToday, isThisWeek };
}
