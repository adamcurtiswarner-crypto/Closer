export interface MilestoneCheckData {
  totalCompletions: number;
  longestStreak: number;
  daysAsCouple: number;
  memoriesSaved: number;
}

export interface MilestoneDefinition {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: 'completions' | 'streak' | 'time' | 'memories';
  threshold: number;
  field: keyof MilestoneCheckData;
}

export const MILESTONES: MilestoneDefinition[] = [
  // Completions
  { id: 'first_prompt', icon: '\u{2728}', title: 'First Spark', description: 'Complete your first prompt', category: 'completions', threshold: 1, field: 'totalCompletions' },
  { id: '10_prompts', icon: '\u{1F525}', title: 'Getting Warmer', description: 'Complete 10 prompts', category: 'completions', threshold: 10, field: 'totalCompletions' },
  { id: '25_prompts', icon: '\u{1F31F}', title: 'Quarter Century', description: 'Complete 25 prompts', category: 'completions', threshold: 25, field: 'totalCompletions' },
  { id: '50_prompts', icon: '\u{1F4AB}', title: 'Halfway There', description: 'Complete 50 prompts', category: 'completions', threshold: 50, field: 'totalCompletions' },
  { id: '100_prompts', icon: '\u{1F3C6}', title: 'Century Club', description: 'Complete 100 prompts', category: 'completions', threshold: 100, field: 'totalCompletions' },
  { id: '250_prompts', icon: '\u{1F48E}', title: 'Deep Connection', description: 'Complete 250 prompts', category: 'completions', threshold: 250, field: 'totalCompletions' },

  // Streak
  { id: '3_day_streak', icon: '\u{26A1}', title: 'On a Roll', description: 'Reach a 3-day streak', category: 'streak', threshold: 3, field: 'longestStreak' },
  { id: '7_day_streak', icon: '\u{1F4AA}', title: 'Week Strong', description: 'Reach a 7-day streak', category: 'streak', threshold: 7, field: 'longestStreak' },
  { id: '14_day_streak', icon: '\u{1F3AF}', title: 'Fortnight', description: 'Reach a 14-day streak', category: 'streak', threshold: 14, field: 'longestStreak' },
  { id: '30_day_streak', icon: '\u{1F320}', title: 'Monthly Magic', description: 'Reach a 30-day streak', category: 'streak', threshold: 30, field: 'longestStreak' },

  // Time
  { id: '1_week', icon: '\u{1F331}', title: 'One Week In', description: 'Together on Stoke for 1 week', category: 'time', threshold: 7, field: 'daysAsCouple' },
  { id: '1_month', icon: '\u{1F33F}', title: 'First Month', description: 'Together on Stoke for 1 month', category: 'time', threshold: 30, field: 'daysAsCouple' },
  { id: '3_months', icon: '\u{1F333}', title: 'Going Strong', description: 'Together on Stoke for 3 months', category: 'time', threshold: 90, field: 'daysAsCouple' },
  { id: '6_months', icon: '\u{1F338}', title: 'Half Year', description: 'Together on Stoke for 6 months', category: 'time', threshold: 180, field: 'daysAsCouple' },
  { id: '1_year', icon: '\u{1F3C5}', title: 'One Year', description: 'Together on Stoke for 1 year', category: 'time', threshold: 365, field: 'daysAsCouple' },

  // Memories
  { id: 'first_memory', icon: '\u{1F4F8}', title: 'First Memory', description: 'Save your first memory', category: 'memories', threshold: 1, field: 'memoriesSaved' },
  { id: '10_memories', icon: '\u{1F4DA}', title: 'Memory Keeper', description: 'Save 10 memories', category: 'memories', threshold: 10, field: 'memoriesSaved' },
  { id: '25_memories', icon: '\u{1F381}', title: 'Treasure Chest', description: 'Save 25 memories', category: 'memories', threshold: 25, field: 'memoriesSaved' },
];

export interface MilestoneStatus {
  achieved: (MilestoneDefinition & { progress: number })[];
  upcoming: (MilestoneDefinition & { progress: number })[];
  next: (MilestoneDefinition & { current: number }) | null;
}

export function getMilestoneStatus(data: MilestoneCheckData): MilestoneStatus {
  const achieved: (MilestoneDefinition & { progress: number })[] = [];
  const upcoming: (MilestoneDefinition & { progress: number })[] = [];
  let next: (MilestoneDefinition & { current: number }) | null = null;

  for (const milestone of MILESTONES) {
    const current = data[milestone.field];
    const progress = Math.min(current / milestone.threshold, 1);

    if (current >= milestone.threshold) {
      achieved.push({ ...milestone, progress: 1 });
    } else {
      upcoming.push({ ...milestone, progress });
      if (!next) {
        next = { ...milestone, current };
      }
    }
  }

  return { achieved, upcoming, next };
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
