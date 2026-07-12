// Single source of truth for when the daily prompt arrives: 08:00 in the
// user's LOCAL timezone, the same for everyone (founder decision 2026-07-12).
//
// The backend twin lives in functions/src/prompts.ts
// (DELIVERY_HOUR_LOCAL = 8); the unit test in src/__tests__/promptTime.test.ts
// keeps the two in lockstep. The legacy per-user `notification_time` field is
// vestigial — never written by the client, ignored by delivery, left on old
// user docs without migration.

export const DAILY_PROMPT_TIME = '08:00';
