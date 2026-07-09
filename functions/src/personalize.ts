/**
 * Server-side prompt personalization — mirror of the client util
 * (app/src/utils/personalize.ts), kept independently simple on purpose
 * (no shared package between app and functions).
 *
 * Prompt text may carry {partner} and {me} tokens. Anything the server
 * embeds in a push body must be personalized FOR THE RECIPIENT first:
 *   {partner} → the OTHER member's first name
 *   {me}      → the recipient's own first name
 * Fallbacks keep the sentence grammatical when a name is missing:
 *   {partner} → "your partner"     {me} → "you"
 *
 * Personalization is display-only — Firestore always keeps the canonical
 * tokenized text (assignments, completions, follow-ups are never rewritten).
 */

export interface PersonalizeNames {
  partnerName?: string | null;
  selfName?: string | null;
}

const PARTNER_TOKEN = /\{partner\}/g;
const ME_TOKEN = /\{me\}/g;

const PARTNER_FALLBACK = 'your partner';
const ME_FALLBACK = 'you';

/** First name only — "Adam Warner" reads better as "Adam" mid-sentence. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

function cleanName(name: string | null | undefined): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  return trimmed.length > 0 ? firstName(trimmed) : null;
}

/**
 * Capitalize fallback words that landed at the start of the text or of a
 * sentence ("your partner" → "Your partner"). Real names are already
 * capitalized; token names never need this.
 */
function fixSentenceCase(text: string): string {
  return text.replace(
    /(^|[.!?]\s+)(your partner|you)\b/g,
    (_m, boundary: string, word: string) =>
      `${boundary}${word.charAt(0).toUpperCase()}${word.slice(1)}`
  );
}

export function personalizeText(text: string, names: PersonalizeNames): string {
  if (!text) return text;
  if (!PARTNER_TOKEN.test(text) && !ME_TOKEN.test(text)) return text;
  // .test() with /g/ advances lastIndex — reset before replacing
  PARTNER_TOKEN.lastIndex = 0;
  ME_TOKEN.lastIndex = 0;

  const partner = cleanName(names.partnerName);
  const self = cleanName(names.selfName);

  const replaced = text
    .replace(PARTNER_TOKEN, partner ?? PARTNER_FALLBACK)
    .replace(ME_TOKEN, self ?? ME_FALLBACK);

  return partner && self ? replaced : fixSentenceCase(replaced);
}

/** True when the text still carries unreplaced tokens (push QA guard). */
export function hasPersonalizationTokens(text: string): boolean {
  return /\{partner\}|\{me\}/.test(text);
}
