/**
 * Pure gating logic for the push-notification pre-prompt.
 *
 * The system permission dialog is a one-shot resource — we only spend it after
 * the user has felt the product work (their first submitted answer). This
 * module decides WHETHER the branded pre-prompt card may show; the hook
 * (useNotificationPrePrompt) owns storage and side effects.
 *
 * Rules:
 * - Only when the OS permission is still undetermined. Granted needs nothing;
 *   denied is respected forever (no re-prompt, no nagging).
 * - Never after the system dialog has been shown once (push_prompted flag) —
 *   whatever the user chose there is final.
 * - At most once per session, and at most MAX_PREPROMPT_EXPOSURES lifetime.
 * - The second (final) exposure is only re-offered at a reveal — the moment
 *   the value of "know when they answer" is most concrete.
 * - NEVER while an unseen completed reveal is (about to be) on screen: the
 *   reveal ceremony is the product's core moment and nothing may cover it.
 *   The card waits for the next natural seam (e.g. the next mount, once the
 *   reveal has been seen).
 */

/** AsyncStorage flag: the OS permission dialog has been shown once. */
export const PUSH_SYSTEM_PROMPTED_KEY = 'push_prompted';
/** AsyncStorage counter: lifetime pre-prompt card exposures. */
export const PUSH_PREPROMPT_EXPOSURES_KEY = 'push_preprompt_exposures';

export const MAX_PREPROMPT_EXPOSURES = 2;

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type PrePromptTrigger = 'first_submit' | 'reveal';

export interface PrePromptGateInput {
  /** Current OS notification permission. */
  permission: PushPermissionStatus;
  /** True once the real system dialog has ever been shown. */
  systemPrompted: boolean;
  /** Lifetime count of pre-prompt card exposures. */
  exposures: number;
  /** True once the card has been offered (or dismissed) this session. */
  offeredThisSession: boolean;
  /** Which seam is asking. */
  trigger: PrePromptTrigger;
  /**
   * True when an unseen completed reveal is on screen (or is about to take
   * it — e.g. a submit that completes the day). The reveal always wins.
   */
  revealUnseen: boolean;
}

export function shouldShowPrePrompt(input: PrePromptGateInput): boolean {
  // The reveal ceremony owns the screen — the card yields, unconditionally.
  if (input.revealUnseen) return false;
  if (input.permission !== 'undetermined') return false;
  if (input.systemPrompted) return false;
  if (input.offeredThisSession) return false;
  if (input.exposures >= MAX_PREPROMPT_EXPOSURES) return false;
  // The one re-offer happens after a reveal, not on every submit
  if (input.exposures >= 1 && input.trigger !== 'reveal') return false;
  return true;
}

export function parseExposureCount(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
