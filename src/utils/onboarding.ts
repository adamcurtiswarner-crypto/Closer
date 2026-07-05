// Shared onboarding completion write.
// Single source of truth for is_onboarded semantics: the flag flips
// either on the final "ready" step or when the user skips pairing
// from the invite screen (so Today can offer inviting again later).
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logEvent } from '@/services/analytics';

export interface CompleteOnboardingOptions {
  /** True when the user skipped inviting a partner. */
  skippedInvite?: boolean;
  /** Optional prompt time (HH:mm) chosen on the final step. */
  notificationTime?: string;
}

/**
 * Mark onboarding complete for a user. Throws on write failure so
 * callers can keep the user on the current screen with feedback.
 */
export async function completeOnboarding(
  userId: string,
  options: CompleteOnboardingOptions = {}
): Promise<void> {
  const payload: Record<string, unknown> = {
    is_onboarded: true,
    onboarding_completed_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  if (options.notificationTime) {
    payload.notification_time = options.notificationTime;
  }

  await updateDoc(doc(db, 'users', userId), payload);

  logEvent('onboarding_completed', {
    skipped_invite: options.skippedInvite === true,
  });
}
