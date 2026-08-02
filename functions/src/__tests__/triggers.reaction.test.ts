/**
 * Reaction push copy — re-enabled 2026-08-02 (Hooked audit).
 *
 * The push title is the reactor's display name, so every body must read as a
 * continuation of the name ("Masha loved your answer."). Brand voice: no
 * emojis, no exclamation points, sentence case continuation.
 */
import { reactionPushBody } from '../triggers';

describe('reactionPushBody', () => {
  it.each([
    ['heart', 'loved your answer.'],
    ['fire', 'felt a spark in your answer.'],
    ['laughing', 'smiled at your answer.'],
    ['teary', 'was moved by your answer.'],
  ])('maps %s to reaction-specific copy', (reaction, expected) => {
    expect(reactionPushBody(reaction)).toBe(expected);
  });

  it('falls back to neutral copy for unknown reaction values', () => {
    expect(reactionPushBody('confetti')).toBe('reacted to your answer.');
    expect(reactionPushBody('')).toBe('reacted to your answer.');
  });

  it.each(['heart', 'fire', 'laughing', 'teary', 'unknown'])(
    'brand voice for %s: no emoji, no exclamation, lowercase continuation',
    (reaction) => {
      const body = reactionPushBody(reaction);
      expect(body).not.toMatch(/[!\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
      expect(body[0]).toBe(body[0].toLowerCase());
      expect(body.endsWith('.')).toBe(true);
    }
  );
});
