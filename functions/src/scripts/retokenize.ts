/**
 * Retokenize: canonical "your partner" → "{partner}" transformation.
 *
 * Pure module (no firebase-admin side effects) shared by:
 *   - the one-time seed-data transform (app/data/*.json)
 *   - the live-collection migration (retokenizePrompts.ts)
 *   - unit tests
 *
 * Rules (deliberately narrow — see personalize.ts for render semantics):
 *   - "your partner's" → "{partner}'s"      (possessive survives outside the token)
 *   - "your partner"   → "{partner}"        (any casing of "your")
 *   - "you and your partner" → "you and {partner}"  (falls out of the rule above)
 *   - "your partnership" is NOT touched (word boundary)
 *   - "you"/"your" are never token-swapped generally — only the explicit
 *     partner phrases above.
 *
 * Sentence-start "Your partner" becoming "{partner}" is fine: real names are
 * capitalized, and the client/server personalizers restore "Your partner"
 * casing for the fallback.
 */

const PARTNER_PHRASE = /\b[Yy]our partner\b/g;

/**
 * Judgment-pass hand-fixes: places where the mechanical result reads wrong
 * with a real name substituted. Keyed by the mechanical output so the live
 * migration lands on exactly the same text as the retokenized seed files.
 */
const HAND_FIXES: Readonly<Record<string, string>> = {
  // "What did Sarah do lately that made them easy to talk to?" — the "them"
  // turns ambiguous next to a name.
  'What did {partner} do lately that made them easy to talk to? Name the thing, so they know to do it again.':
    'What did {partner} do lately that made talking feel easy? Name the thing, so they know to do it again.',
  // "from inside Sarah" reads oddly visceral with a name — match the
  // "from {partner}'s side" phrasing the other divergence templates use.
  'You feel differently about how conflict goes between you. What might disagreements feel like from inside {partner} — before, during, after?':
    "You feel differently about how conflict goes between you. What might disagreements feel like from {partner}'s side — before, during, after?",
};

/** Apply the partner-phrase → token transformation (plus hand-fixes) to one string. */
export function retokenizeText(text: string): string {
  if (!text) return text;
  const mechanical = text.replace(PARTNER_PHRASE, '{partner}');
  return HAND_FIXES[mechanical] ?? mechanical;
}

/**
 * Retokenize a set of fields on a document, returning only the fields whose
 * transformed value differs (empty object = nothing to migrate).
 */
export function retokenizeFields(
  data: Record<string, unknown>,
  fields: readonly string[]
): Record<string, string> {
  const changed: Record<string, string> = {};
  for (const field of fields) {
    const value = data[field];
    if (typeof value !== 'string') continue;
    const transformed = retokenizeText(value);
    if (transformed !== value) changed[field] = transformed;
  }
  return changed;
}

/** Text fields that may carry partner phrases, per collection. */
export const PROMPT_TEXT_FIELDS = ['text', 'hint'] as const;
export const FOLLOW_UP_TEMPLATE_TEXT_FIELDS = ['text', 'closing_text'] as const;
