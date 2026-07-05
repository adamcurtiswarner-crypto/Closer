import { logger } from '@/utils/logger';

/**
 * Hosts that serve the /join/CODE universal link page.
 * The first entry is the canonical link domain used when building links.
 * `link.getstoke.io` is a future alias (not yet live) — accepted on parse,
 * never used to build links until DNS points at Firebase Hosting.
 */
export const INVITE_LINK_HOSTS = ['stoke-5f762.web.app', 'link.getstoke.io'] as const;

export const INVITE_LINK_DOMAIN: string = INVITE_LINK_HOSTS[0];

const CODE_PATTERN = '([A-Z0-9]{6})(?![A-Z0-9])';

// stoke://join/CODE (closer:// kept for backward compat)
const CUSTOM_SCHEME_REGEX = new RegExp(`(?:stoke|closer)://join/${CODE_PATTERN}`, 'i');

// https://<host>/join/CODE — current hosts plus legacy stoke.app / closer.app
const UNIVERSAL_LINK_REGEX = new RegExp(
  `(?:stoke-5f762\\.web\\.app|link\\.getstoke\\.io|(?:stoke|closer)\\.app)/join/${CODE_PATTERN}`,
  'i'
);

/**
 * Builds the canonical invite link for a code, e.g.
 * https://stoke-5f762.web.app/join/ABC123
 */
export function buildInviteLink(code: string): string {
  return `https://${INVITE_LINK_DOMAIN}/join/${code.trim().toUpperCase()}`;
}

/**
 * Extracts a 6-character invite code from any supported deep link URL.
 * Returns null when the URL is not an invite link.
 */
export function extractInviteCode(url: string): string | null {
  if (!url) return null;

  const customSchemeMatch = url.match(CUSTOM_SCHEME_REGEX);
  if (customSchemeMatch) {
    return customSchemeMatch[1].toUpperCase();
  }

  const universalLinkMatch = url.match(UNIVERSAL_LINK_REGEX);
  if (universalLinkMatch) {
    return universalLinkMatch[1].toUpperCase();
  }

  return null;
}

/**
 * Best-effort clipboard write of the invite link at share time.
 * Never throws — the share sheet must open regardless of clipboard state.
 */
export async function copyInviteToClipboard(code: string | null | undefined): Promise<void> {
  if (!code) return;

  try {
    // Lazy require keeps this module importable in environments without the
    // native clipboard module (e.g. unit tests of the pure helpers above).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
    await Clipboard.setStringAsync(buildInviteLink(code));
  } catch (error) {
    logger.error('Failed to copy invite link to clipboard:', error);
  }
}
