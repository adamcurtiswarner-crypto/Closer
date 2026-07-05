// Clipboard invite detection for the accept-invite screen.
// Builds on extractInviteCode (src/utils/inviteLink.ts) for URL parsing
// so join-link host handling stays in one place.
import { extractInviteCode } from '@/utils/inviteLink';

// Codes are 6 characters, A-Z and 2-9 (see useCouple generateInviteCode).
const CODE_SHAPE = /^[A-Z0-9]{6}$/;

export interface ClipboardInviteMatch {
  code: string;
  source: 'code' | 'url';
}

/**
 * Detect an invite code in arbitrary clipboard text.
 * Returns the normalized code and whether it came from a bare code
 * or a full join URL. Returns null when the text is not an invite.
 */
export function matchClipboardInvite(text: string): ClipboardInviteMatch | null {
  if (!text) return null;

  const trimmed = text.trim();

  const fromUrl = extractInviteCode(trimmed);
  if (fromUrl) {
    return { code: fromUrl, source: 'url' };
  }

  const upper = trimmed.toUpperCase();
  if (CODE_SHAPE.test(upper)) {
    return { code: upper, source: 'code' };
  }

  return null;
}
