/**
 * Safety lexicon — crisis language detection for the v1 safety off-ramp.
 *
 * When a partner's free-text response contains crisis language, the app
 * quietly shows that user a resources screen and the server suppresses any
 * follow-up on the assignment. Tending, not treating: the match only ever
 * gates features off and offers support — it never labels, blocks, or logs
 * the matched text.
 *
 * IMPORTANT: This list is mirrored in functions/src/shared.ts
 * (CRISIS_TERMS + containsCrisisLanguage). The two copies MUST stay
 * identical — update both together.
 *
 * Matching strategy (false-positive guards):
 * - Lowercased, word-boundary matching: "harm" alone never fires,
 *   "hurt myself" does; "harmless" and "no harm done" never fire.
 * - Bare ambiguous idioms are excluded ("hit me" as in "it hit me",
 *   "beat me" as in "beat me at chess"); pronoun-anchored forms are
 *   included instead ("he hit me", "hits me").
 * - Multi-word phrases tolerate any run of whitespace between words.
 * - Curly apostrophes are normalized so "don’t want to live" matches.
 */

export const CRISIS_TERMS: readonly string[] = [
  // Suicide & wanting to die
  'suicide',
  'suicidal',
  'kill myself',
  'killing myself',
  'end my life',
  'ending my life',
  'end it all',
  'take my own life',
  'want to die',
  'wanted to die',
  'wanna die',
  'wish i was dead',
  'wish i were dead',
  'better off dead',
  "don't want to be alive",
  "don't want to live",
  'no reason to live',

  // Self-harm
  'hurt myself',
  'hurting myself',
  'harm myself',
  'harming myself',
  'cut myself',
  'cutting myself',
  'self harm',
  'self-harm',

  // Abuse & violence in the relationship
  'abuse',
  'abused',
  'abusive',
  'abuses me',
  'domestic violence',
  'hits me',
  'hitting me',
  'he hit me',
  'she hit me',
  'they hit me',
  'beats me up',
  'beat me up',
  'he beats me',
  'she beats me',
  'threatens me',
  'threatened me',
  'threatening me',
  'rape',
  'raped',
  'sexual assault',
  'molested',

  // Fear for safety
  'afraid of him',
  'afraid of her',
  'afraid of them',
  'scared of him',
  'scared of her',
  'scared of them',
  'afraid for my safety',
  'fear for my safety',
  'not safe at home',
  'unsafe at home',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Precompiled once at module load. Word boundaries prevent substring hits
// ("harmless" never matches "harm myself", "suicidevine" never matches
// "suicide"); interior whitespace in phrases matches any whitespace run.
const CRISIS_PATTERNS: readonly RegExp[] = CRISIS_TERMS.map(
  (term) => new RegExp(`\\b${escapeRegExp(term).replace(/\s+/g, '\\s+')}\\b`)
);

/**
 * Returns true when the text contains crisis language (self-harm, suicide,
 * abuse, violence, acute crisis). Case-insensitive, word-boundary aware.
 */
export function containsCrisisLanguage(text: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase().replace(/[‘’]/g, "'");
  return CRISIS_PATTERNS.some((pattern) => pattern.test(normalized));
}
