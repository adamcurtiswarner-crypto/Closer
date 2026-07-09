/**
 * Retokenize transformation (scripts/retokenize.ts) — the canonical
 * "your partner" → "{partner}" content migration applied to both the seed
 * JSON files and (via retokenizePrompts.ts) the live prompts /
 * follow_up_templates collections.
 */
import {
  retokenizeText,
  retokenizeFields,
  PROMPT_TEXT_FIELDS,
  FOLLOW_UP_TEMPLATE_TEXT_FIELDS,
} from '../scripts/retokenize';

describe('retokenizeText', () => {
  it('replaces "your partner" with the token', () => {
    expect(retokenizeText('How sure are you that your partner would show up?')).toBe(
      'How sure are you that {partner} would show up?'
    );
  });

  it('keeps the possessive outside the token', () => {
    expect(retokenizeText("What might this feel like from your partner's side?")).toBe(
      "What might this feel like from {partner}'s side?"
    );
  });

  it('handles sentence-start "Your partner"', () => {
    expect(retokenizeText('Your partner had a long week.')).toBe('{partner} had a long week.');
  });

  it('transforms "you and your partner" into "you and {partner}"', () => {
    expect(retokenizeText('Something you and your partner both enjoy.')).toBe(
      'Something you and {partner} both enjoy.'
    );
  });

  it('does NOT touch "your partnership"', () => {
    const text = 'Think about the qualities of your partnership, not the milestones.';
    expect(retokenizeText(text)).toBe(text);
  });

  it('does NOT token-swap generic "you"/"your"', () => {
    const text = "What's one thing you're looking forward to this week?";
    expect(retokenizeText(text)).toBe(text);
  });

  it('is idempotent', () => {
    const once = retokenizeText('Tell your partner one thing.');
    expect(retokenizeText(once)).toBe(once);
  });

  it('handles empty text', () => {
    expect(retokenizeText('')).toBe('');
  });

  it('applies the communication-deepener hand-fix (ambiguous "them")', () => {
    expect(
      retokenizeText(
        'What did your partner do lately that made them easy to talk to? Name the thing, so they know to do it again.'
      )
    ).toBe(
      'What did {partner} do lately that made talking feel easy? Name the thing, so they know to do it again.'
    );
  });

  it('applies the conflict-divergence hand-fix ("from inside" → "from …\'s side")', () => {
    expect(
      retokenizeText(
        'You feel differently about how conflict goes between you. What might disagreements feel like from inside your partner — before, during, after?'
      )
    ).toBe(
      "You feel differently about how conflict goes between you. What might disagreements feel like from {partner}'s side — before, during, after?"
    );
  });
});

describe('retokenizeFields', () => {
  it('returns only fields whose transformed value differs', () => {
    const changes = retokenizeFields(
      {
        text: 'What has your partner done lately that you respect?',
        hint: 'Small counts.',
        type: 'money',
      },
      PROMPT_TEXT_FIELDS
    );
    expect(changes).toEqual({ text: 'What has {partner} done lately that you respect?' });
  });

  it('returns an empty object when nothing changes (idempotent migration)', () => {
    expect(
      retokenizeFields(
        { text: 'What did {partner} do this week that made you laugh?', closing_text: null },
        FOLLOW_UP_TEMPLATE_TEXT_FIELDS
      )
    ).toEqual({});
  });

  it('ignores non-string fields safely', () => {
    expect(retokenizeFields({ text: 42, hint: undefined }, PROMPT_TEXT_FIELDS)).toEqual({});
  });
});
