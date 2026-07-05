import { CRISIS_TERMS, containsCrisisLanguage } from '../utils/safetyLexicon';

describe('safetyLexicon', () => {
  describe('containsCrisisLanguage — positives', () => {
    it.each([
      'I want to die',
      'some days I think about suicide',
      'I feel suicidal lately',
      "I've been wanting to kill myself",
      'I just want to end my life',
      'sometimes I hurt myself to cope',
      'I have been cutting myself again',
      'I struggle with self-harm',
      'I struggle with self harm',
      'he hits me when he drinks',
      'she hit me last night',
      'I am afraid of him when he gets angry',
      'honestly I am scared of her temper',
      'the abuse has been getting worse',
      'my last relationship was abusive',
      'he threatened me again yesterday',
      'I fear for my safety at night',
      'I do not feel like there is any reason... I wish I was dead',
    ])('matches crisis language: %s', (text) => {
      expect(containsCrisisLanguage(text)).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(containsCrisisLanguage('I WANT TO DIE')).toBe(true);
      expect(containsCrisisLanguage('Suicide')).toBe(true);
      expect(containsCrisisLanguage('He Hits Me')).toBe(true);
    });

    it('matches phrases across extra whitespace and line breaks', () => {
      expect(containsCrisisLanguage('kill  myself')).toBe(true);
      expect(containsCrisisLanguage('want to\ndie')).toBe(true);
    });

    it('normalizes curly apostrophes', () => {
      expect(containsCrisisLanguage('I don’t want to live anymore')).toBe(true);
    });

    it('matches when the phrase is embedded in a longer sentence', () => {
      expect(
        containsCrisisLanguage('Honestly it was a hard week and I wanted to die of shame, ha')
      ).toBe(true);
    });
  });

  describe('containsCrisisLanguage — negatives (false-positive guards)', () => {
    it.each([
      'no harm done, we laughed it off',
      'it was a harmless misunderstanding',
      'that comment really hurt but we talked it through',
      'I would never want to harm our relationship',
      'the deadline is killing me at work',
      'we watched a movie and it hit me how much I love you',
      'you beat me at chess again',
      'beats me why we argued about that',
      'the ending of that show was to die for',
      'I cut my finger cooking dinner',
      '',
      '   ',
    ])('does not match: %s', (text) => {
      expect(containsCrisisLanguage(text)).toBe(false);
    });

    it('requires word boundaries — substrings never fire', () => {
      // "abuse" inside a longer word
      expect(containsCrisisLanguage('the disabused notion we had')).toBe(false);
      // "rape" inside "grapes" / "drape"
      expect(containsCrisisLanguage('we shared grapes and cheese')).toBe(false);
      expect(containsCrisisLanguage('the drape in the bedroom')).toBe(false);
    });
  });

  describe('lexicon integrity', () => {
    it('contains only lowercase terms (matcher normalizes to lowercase)', () => {
      for (const term of CRISIS_TERMS) {
        expect(term).toBe(term.toLowerCase());
      }
    });

    it('has no duplicate terms', () => {
      expect(new Set(CRISIS_TERMS).size).toBe(CRISIS_TERMS.length);
    });

    it('stays in sync with the server lexicon in functions/src/shared.ts', () => {
      // Read the mirrored constant straight from the server source so a
      // one-sided edit fails loudly here.
      const fs = require('fs');
      const path = require('path');
      const serverSource = fs.readFileSync(
        path.join(__dirname, '../../functions/src/shared.ts'),
        'utf8'
      );
      for (const term of CRISIS_TERMS) {
        const singleQuoted = `'${term}'`;
        const doubleQuoted = `"${term}"`;
        const present =
          serverSource.includes(singleQuoted) || serverSource.includes(doubleQuoted);
        if (!present) {
          throw new Error(
            `Lexicon out of sync: "${term}" missing from functions/src/shared.ts`
          );
        }
      }
    });
  });
});
