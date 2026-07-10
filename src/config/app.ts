import { buildInviteLink } from '@/utils/inviteLink';

export const SUPPORT_EMAIL = 'support@stoke.llc';

/**
 * The invite message a user sends their partner. It arrives from the
 * inviter's own phone, so it is written in first person — never "X is
 * inviting you", which reads like a bot. Warm, quiet, direct; the common
 * objections (what is it, how much effort, what it costs) are answered
 * inside the message. No exclamation points.
 *
 * The inviter's first name (when available) rides along on the link as a
 * `from` param so the join page can greet the partner by the inviter's name.
 */
export function getShareMessage(code: string, inviterName?: string | null): string {
  const firstName = inviterName?.trim().split(/\s+/)[0];
  const link = buildInviteLink(code, firstName);
  return `I want to try this with us — one question a day, we each answer privately, then see each other's. Takes about three minutes, and it's free for you. ${link}`;
}

/**
 * Builds the support mailto URL used by the in-app "Contact us" row.
 * Pre-fills only the app version and platform — no user identifiers.
 */
export function getSupportEmailUrl(appVersion: string, platform: string): string {
  const subject = encodeURIComponent('Stoke support');
  const body = encodeURIComponent(
    `\n\n—\nApp version: ${appVersion}\nPlatform: ${platform}`
  );
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
