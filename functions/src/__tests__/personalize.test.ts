/**
 * Server-side personalization util (personalize.ts) — mirror of the client
 * util in app/src/utils/personalize.ts. Same replacement + fallback
 * semantics; used to render {partner}/{me} tokens in push bodies FOR THE
 * RECIPIENT before the text is embedded/truncated.
 */
import { personalizeText, hasPersonalizationTokens } from '../personalize';

describe('personalizeText', () => {
  const names = { partnerName: 'Sarah', selfName: 'Adam' };

  it('replaces {partner} with the partner first name', () => {
    expect(
      personalizeText("What's something {partner} did this week that made you smile?", names)
    ).toBe("What's something Sarah did this week that made you smile?");
  });

  it('replaces {me} with the reader first name', () => {
    expect(personalizeText('What could {me} do to make mornings easier?', names)).toBe(
      'What could Adam do to make mornings easier?'
    );
  });

  it('replaces multiple occurrences of both tokens', () => {
    expect(
      personalizeText('When {partner} laughs, how does {partner} make {me} feel?', names)
    ).toBe('When Sarah laughs, how does Sarah make Adam feel?');
  });

  it('uses first name only from a full display name', () => {
    expect(
      personalizeText('Ask {partner} about it.', { partnerName: '  Sarah Warner ', selfName: null })
    ).toBe('Ask Sarah about it.');
  });

  it('falls back to "your partner" and "you" when names are missing', () => {
    expect(
      personalizeText('What does {partner} appreciate about {me}?', {
        partnerName: null,
        selfName: null,
      })
    ).toBe('What does your partner appreciate about you?');
  });

  it('capitalizes a fallback at the start of the text', () => {
    expect(
      personalizeText('{partner} had a hard day. What helped?', {
        partnerName: null,
        selfName: null,
      })
    ).toBe('Your partner had a hard day. What helped?');
  });

  it('capitalizes a fallback after a sentence boundary', () => {
    expect(
      personalizeText('Think back. {partner} surprised you once. When?', {
        partnerName: null,
        selfName: null,
      })
    ).toBe('Think back. Your partner surprised you once. When?');
  });

  it('does not sentence-case real names or token-free text', () => {
    expect(personalizeText('you and your partner both matter.', names)).toBe(
      'you and your partner both matter.'
    );
  });

  it('treats empty-string and undefined names as missing', () => {
    expect(
      personalizeText('What makes {partner} feel loved?', { partnerName: '   ', selfName: '' })
    ).toBe('What makes your partner feel loved?');
    expect(personalizeText('What makes {partner} feel loved?', {})).toBe(
      'What makes your partner feel loved?'
    );
  });

  it('returns token-free text unchanged', () => {
    const text = 'What are you grateful for today?';
    expect(personalizeText(text, names)).toBe(text);
  });

  it('handles empty text', () => {
    expect(personalizeText('', names)).toBe('');
  });

  it('is stable across repeated calls (regex lastIndex reset)', () => {
    const text = 'Tell {partner} one thing.';
    expect(personalizeText(text, names)).toBe('Tell Sarah one thing.');
    expect(personalizeText(text, names)).toBe('Tell Sarah one thing.');
    expect(personalizeText(text, names)).toBe('Tell Sarah one thing.');
  });
});

describe('hasPersonalizationTokens', () => {
  it('detects tokens', () => {
    expect(hasPersonalizationTokens('Hi {partner}')).toBe(true);
    expect(hasPersonalizationTokens('About {me}')).toBe(true);
    expect(hasPersonalizationTokens('No tokens here')).toBe(false);
  });
});
