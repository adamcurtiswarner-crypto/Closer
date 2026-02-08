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
}

export interface Couple {
  id: string;
  memberIds: [string, string];
  status: CoupleStatus;
  totalCompletions: number;
  currentWeekCompletions: number;
}

export type ToneCalibration = 'solid' | 'distant' | 'struggling';
export type CoupleStatus = 'pending' | 'active' | 'paused' | 'deleted';

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
