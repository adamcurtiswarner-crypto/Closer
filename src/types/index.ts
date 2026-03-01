/**
 * Closer App — Core Types
 */

// App-specific types

export interface AppState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  couple: Couple | null;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  partnerName: string | null;
  coupleId: string | null;
  notificationTime: string;
  timezone: string;
  toneCalibration: ToneCalibration;
  isOnboarded: boolean;
  photoUrl: string | null;
  partnerPhotoUrl: string | null;
  loveLanguage: string | null;
  locale: string | null;
  relationshipStage: RelationshipStage | null;
  pendingCheckIn: boolean;
}

export interface Couple {
  id: string;
  memberIds: [string, string];
  status: CoupleStatus;
  totalCompletions: number;
  currentWeekCompletions: number;
  currentStreak: number;
  longestStreak: number;
  promptFrequency: 'daily' | 'weekdays' | 'weekends';
  premiumUntil: Date | null;
  premiumSource: string | null; // user ID of purchaser
}

export type ToneCalibration = 'solid' | 'distant' | 'struggling';
export type CoupleStatus = 'pending' | 'active' | 'paused' | 'deleted';
export type RelationshipStage = 'dating' | 'engaged' | 'married' | 'long_distance';

// Navigation types
export type RootStackParamList = {
  '(auth)': undefined;
  '(app)': undefined;
  '(onboarding)': undefined;
};

export type AuthStackParamList = {
  welcome: undefined;
  'sign-in': undefined;
  'sign-up': undefined;
  'forgot-password': undefined;
};

export type OnboardingStackParamList = {
  'invite-partner': undefined;
  'accept-invite': undefined;
  'waiting-partner': undefined;
  preferences: undefined;
  'tone-calibration': undefined;
  'first-prompt': undefined;
  ready: undefined;
};

export type AppTabParamList = {
  today: undefined;
  memories: undefined;
  settings: undefined;
};

// Form types
export interface SignUpFormData {
  email: string;
  password: string;
}

export interface SignInFormData {
  email: string;
  password: string;
}

export interface OnboardingPreferencesFormData {
  partnerName: string;
  notificationTime: string;
}

export interface PromptResponseFormData {
  responseText: string;
}

// Check-in types
export interface CheckIn {
  id: string;
  userId: string;
  responses: { questionId: string; dimension: string; score: number }[];
  createdAt: Date;
}

// Date Night types
export type DateNightCategory =
  | 'at_home'
  | 'out_about'
  | 'adventure'
  | 'creative'
  | 'food_drink'
  | 'free_budget'
  | 'custom';

export interface DateNight {
  id: string;
  title: string;
  description: string;
  category: DateNightCategory;
  costTier: 'free' | '$' | '$$' | '$$$';
  durationMinutes: number | null;
  source: 'library' | 'custom';
  sourceId: string | null;
  status: 'saved' | 'scheduled' | 'completed' | 'skipped';
  addedBy: string;
  scheduledDate: Date | null;
  scheduledTime: string | null;
  completedAt: Date | null;
  reflectionRating: 'warm' | 'okay' | 'not_great' | null;
  reflectionNote: string | null;
  isArchived: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface DateNightIdea {
  id: string;
  title: string;
  description: string;
  category: DateNightCategory;
  costTier: 'free' | '$' | '$$' | '$$$';
  durationMinutes: number | null;
}
