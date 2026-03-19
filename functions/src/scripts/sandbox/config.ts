import * as admin from 'firebase-admin';

export interface SandboxUserConfig {
  email: string;
  displayName: string;
  toneCalibration: string;
  loveLanguage: string;
}

export interface SandboxConfig {
  startWeeksAgo: number;
  users: {
    user1: SandboxUserConfig;
    user2: SandboxUserConfig;
    password: string;
  };
  engagementByWeek: number[];
  coachingTiers: string[];
  sentimentByEngagement: {
    high: { positive: number; neutral: number; negative: number };
    medium: { positive: number; neutral: number; negative: number };
    low: { positive: number; neutral: number; negative: number };
  };
  responseLengthByEngagement: {
    high: { min: number; max: number };
    medium: { min: number; max: number };
    low: { min: number; max: number };
  };
  chatMessagesPerDay: { min: number; max: number };
  goals: Array<{ name: string; createdWeek: number; completedWeek: number | null }>;
  wishlistItems: Array<{ text: string; toggled: boolean }>;
  photos: Array<{ imageUrl: string; caption: string; weekCreated: number }>;
  milestones: Array<{ title: string; category: string; description: string; date: string; weekCreated: number }>;
  reactionProbability: number;
  checkInScores: number[];
}

export interface AssignmentRecord {
  id: string;
  promptId: string;
  date: Date;
  weekIndex: number;
  engagement: number;
}

export interface ResponseRecord {
  assignmentId: string;
  user1Responded: boolean;
  user2Responded: boolean;
  user1ResponseTime: Date | null;
  user2ResponseTime: Date | null;
}

export interface SandboxContext {
  config: SandboxConfig;
  db: FirebaseFirestore.Firestore;
  auth?: admin.auth.Auth;
  user1Id: string;
  user2Id: string;
  coupleId: string;
  isProduction: boolean;
  isBackfill: boolean;
  isLive: boolean;
  dryRun: boolean;
  promptIds: string[];
  promptMap: Map<string, { text: string; hint: string | null; type: string; requires_conversation: boolean }>;
  assignments: AssignmentRecord[];
  responses: ResponseRecord[];
}

export const DEFAULT_CONFIG: SandboxConfig = {
  startWeeksAgo: 12,
  users: {
    user1: {
      email: 'adam+stoke1@getstoke.io',
      displayName: 'Alex',
      toneCalibration: 'solid',
      loveLanguage: 'quality_time',
    },
    user2: {
      email: 'adam+stoke2@getstoke.io',
      displayName: 'Jordan',
      toneCalibration: 'solid',
      loveLanguage: 'words_of_affirmation',
    },
    password: 'TestStoke2026!',
  },
  engagementByWeek: [0.9, 0.85, 0.8, 0.75, 0.6, 0.55, 0.65, 0.75, 0.85, 0.9, 0.95, 1.0],
  coachingTiers: [
    'thriving', 'steady', 'steady', 'steady', 'cooling', 'cooling',
    'steady', 'steady', 'steady', 'thriving', 'thriving', 'thriving',
  ],
  sentimentByEngagement: {
    high: { positive: 0.7, neutral: 0.2, negative: 0.1 },
    medium: { positive: 0.5, neutral: 0.3, negative: 0.2 },
    low: { positive: 0.3, neutral: 0.4, negative: 0.3 },
  },
  responseLengthByEngagement: {
    high: { min: 80, max: 200 },
    medium: { min: 40, max: 100 },
    low: { min: 20, max: 60 },
  },
  chatMessagesPerDay: { min: 3, max: 8 },
  goals: [
    { name: 'Weekly date night', createdWeek: 1, completedWeek: 8 },
    { name: 'No phones at dinner', createdWeek: 2, completedWeek: 6 },
    { name: 'Morning check-in', createdWeek: 3, completedWeek: 10 },
    { name: 'Plan a trip', createdWeek: 4, completedWeek: null },
    { name: 'Try a new restaurant', createdWeek: 6, completedWeek: 11 },
    { name: 'Read together', createdWeek: 9, completedWeek: null },
  ],
  wishlistItems: [
    { text: 'Weekend getaway to the coast', toggled: true },
    { text: 'Cook a new recipe together', toggled: true },
    { text: 'Sunrise hike', toggled: false },
    { text: 'Pottery class', toggled: false },
    { text: 'Stargazing blanket', toggled: true },
    { text: 'Matching journals', toggled: false },
    { text: 'Concert tickets', toggled: false },
    { text: 'Photo book of our year', toggled: false },
  ],
  photos: [
    { imageUrl: '', caption: 'Our favorite coffee spot', weekCreated: 2 },
    { imageUrl: '', caption: 'Sunday afternoon walk', weekCreated: 4 },
    { imageUrl: '', caption: 'Trying that new restaurant', weekCreated: 7 },
    { imageUrl: '', caption: 'Rainy day indoors', weekCreated: 9 },
    { imageUrl: '', caption: 'Weekend morning', weekCreated: 11 },
  ],
  milestones: [
    { title: 'First trip together', category: 'trip', description: 'A long weekend at the coast', date: '', weekCreated: 3 },
    { title: 'Anniversary dinner', category: 'anniversary', description: 'Two years and counting', date: '', weekCreated: 8 },
  ],
  reactionProbability: 0.4,
  checkInScores: [4.5, 4.3, 4.0, 3.8, 3.2, 3.0, 3.5, 3.8, 4.2, 4.5, 4.7, 4.8],
};

export function getWeekStart(weeksAgo: number): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - (weeksAgo * 7));
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekId(date: Date): string {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

// dayOfWeek: 0 = Monday, 6 = Sunday
export function getDayDate(weeksAgo: number, dayOfWeek: number): Date {
  const weekStart = getWeekStart(weeksAgo);
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayOfWeek);
  return d;
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function pickWeighted<T>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

export function getEngagementLevel(engagement: number): 'high' | 'medium' | 'low' {
  if (engagement >= 0.8) return 'high';
  if (engagement >= 0.6) return 'medium';
  return 'low';
}

export function sandboxTag(): Record<string, unknown> {
  return {
    _sandbox: true,
    _sandbox_created_at: new Date().toISOString(),
  };
}
