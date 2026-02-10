export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  icon: string;
  category: 'communication' | 'quality_time' | 'appreciation' | 'adventure';
}

export const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'appreciation-texts',
    title: 'Send 3 appreciation texts',
    description: 'Tell your partner something you appreciate about them — three separate times this week.',
    targetCount: 3,
    icon: '\u{1F49B}',
    category: 'appreciation',
  },
  {
    id: 'phone-free-dinners',
    title: 'Phone-free dinners',
    description: 'Put your phones away during dinner together at least 4 times this week.',
    targetCount: 4,
    icon: '\u{1F372}',
    category: 'quality_time',
  },
  {
    id: 'morning-check-ins',
    title: 'Morning check-ins',
    description: 'Start 5 mornings by asking your partner how they slept or what they\'re looking forward to.',
    targetCount: 5,
    icon: '\u{2600}\u{FE0F}',
    category: 'communication',
  },
  {
    id: 'surprise-note',
    title: 'Leave a surprise note',
    description: 'Write a short love note and leave it somewhere your partner will find it.',
    targetCount: 1,
    icon: '\u{1F48C}',
    category: 'appreciation',
  },
  {
    id: 'try-something-new',
    title: 'Try something new together',
    description: 'Cook a new recipe, visit a new place, or try a new activity together this week.',
    targetCount: 1,
    icon: '\u{2728}',
    category: 'adventure',
  },
  {
    id: 'active-listening',
    title: 'Practice active listening',
    description: 'Have 3 conversations where you focus on listening without interrupting or offering advice.',
    targetCount: 3,
    icon: '\u{1F442}',
    category: 'communication',
  },
  {
    id: 'compliment-streak',
    title: 'Daily compliments',
    description: 'Give your partner a genuine compliment every day for 5 days.',
    targetCount: 5,
    icon: '\u{1F31F}',
    category: 'appreciation',
  },
  {
    id: 'unplug-together',
    title: 'Unplug for an hour',
    description: 'Spend at least 2 screen-free hours together this week — walk, talk, or just be.',
    targetCount: 2,
    icon: '\u{1F343}',
    category: 'quality_time',
  },
];

/**
 * Deterministically select a weekly challenge based on ISO week string.
 * Same week always returns the same challenge.
 */
export function getWeeklyChallengeForWeek(weekString: string): WeeklyChallenge {
  // Extract week number from ISO week string like "2026-W06"
  const match = weekString.match(/W(\d+)/);
  const weekNum = match ? parseInt(match[1], 10) : 0;
  const index = weekNum % WEEKLY_CHALLENGES.length;
  return WEEKLY_CHALLENGES[index];
}

/**
 * Get current ISO week string (e.g., "2026-W06")
 */
export function getCurrentWeekString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}
