import React from 'react';
import { Redirect } from 'expo-router';

import { FEATURES } from '@/config/features';

/**
 * Wraps a screen so a flagged-off feature's route is unreachable, not just
 * un-tabbed.
 *
 * Thirteen v1 features are hidden by setting `href: null` on their tab.
 * That hides the ENTRANCE; the route stays live, and several things still
 * reach it — a deep link, a state restore, or (as happened on 2026-11-14)
 * pressing back from another hidden tab, which returns to the first screen
 * declared in the navigator rather than the one you came from.
 *
 * Two things went wrong when that happened. A founder saw a screen that
 * does not exist in this product, including "best streak" copy the doctrine
 * bans anywhere. And mounting it attached `useGoals`, whose composite index
 * was never deployed because goals is disabled — FAILED_PRECONDITION
 * straight into production Sentry.
 *
 * The guard has to sit OUTSIDE the screen component rather than early-return
 * inside it: an early return still runs every hook above it, which is
 * exactly how a disabled feature's listener attached in the first place.
 */
export function featureRoute<P extends object>(
  feature: keyof typeof FEATURES,
  Screen: React.ComponentType<P>
): React.ComponentType<P> {
  return function GuardedRoute(props: P) {
    if (!FEATURES[feature]) {
      return <Redirect href="/(app)/today" />;
    }
    return <Screen {...props} />;
  };
}
