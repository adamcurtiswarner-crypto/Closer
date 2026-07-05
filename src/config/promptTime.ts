// Single source of truth for the daily prompt time shown in Settings.
//
// The backend default lives in functions/src/prompts.ts:
//   `(userData.notification_time || '19:00')`
// and useAuth maps `notification_time` with the same '19:00' fallback.
// DEFAULT_PROMPT_TIME must stay in lockstep with that value — the unit test
// in src/__tests__/promptTime.test.ts pins it.

export const DEFAULT_PROMPT_TIME = '19:00';

export interface PromptTimeOption {
  label: string;
  value: string;
  display: string;
}

export const TIME_OPTIONS: readonly PromptTimeOption[] = [
  { label: 'Morning (8 AM)', value: '08:00', display: '8:00 AM' },
  { label: 'Afternoon (2 PM)', value: '14:00', display: '2:00 PM' },
  { label: 'Evening (7 PM)', value: '19:00', display: '7:00 PM' },
  { label: 'Night (9 PM)', value: '21:00', display: '9:00 PM' },
] as const;

// Resolve the stored user value to what delivery will actually use.
export function resolvePromptTime(stored: string | null | undefined): string {
  return stored || DEFAULT_PROMPT_TIME;
}

// Human display for a stored HH:mm value; unknown values pass through as-is.
export function getTimeDisplay(value: string): string {
  return TIME_OPTIONS.find((t) => t.value === value)?.display || value;
}
