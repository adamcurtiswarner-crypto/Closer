# Sentry Crash Reporting Integration

## Context
Stoke has 3 features live in production with zero crash visibility. The app uses a custom ErrorBoundary and logger utility that currently only log to console. Sentry integration provides crash reporting, error tracking, and production diagnostics.

## Approach
Standard `@sentry/react-native` with Expo config plugin. DSN from `EXPO_PUBLIC_SENTRY_DSN` env var. No performance monitoring (YAGNI).

## Integration Points

### 1. Root Layout (`app/_layout.tsx`)
- `Sentry.init()` at top of file, before component definition
- `Sentry.wrap(RootLayout)` on export
- Set user context (anonymous `user.id` only) when auth state changes
- `beforeSend` callback for data scrubbing

### 2. ErrorBoundary (`src/components/ErrorBoundary.tsx`)
- Add `Sentry.captureException(error, { contexts: { react: errorInfo } })` in `componentDidCatch`

### 3. Logger (`src/utils/logger.ts`)
- Wire `logger.error` to call `Sentry.captureException` in production
- Existing stub comment already anticipates this

### 4. Config Files
- `app.json`: add `@sentry/react-native/expo` to plugins
- `jest.config.js`: add `@sentry/react-native` to transformIgnorePatterns
- `.env.example`: add `EXPO_PUBLIC_SENTRY_DSN`

## Data Scrubbing (`beforeSend`)
- Strip `response_text` and `response_text_encrypted` from breadcrumb data
- Strip `partnerName`, `displayName` fields from extra context
- Strip any value containing `[encrypted]` sentinel
- User identification via anonymous `user.id` only (no email, no couple ID)

## Out of Scope
- Sentry performance monitoring / tracing
- Cloud Functions Sentry integration (separate package, separate concern)
- Custom Sentry dashboards or alerting rules (configure in Sentry UI)

## Requires
- EAS build after integration (native module)
- Sentry account + project creation (DSN plugged in via env var)
