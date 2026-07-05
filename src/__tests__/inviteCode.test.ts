import { matchClipboardInvite } from '@/utils/inviteCode';

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('matchClipboardInvite', () => {
  describe('bare invite codes', () => {
    it('matches an uppercase 6-character code', () => {
      expect(matchClipboardInvite('ABC123')).toEqual({ code: 'ABC123', source: 'code' });
    });

    it('normalizes lowercase codes', () => {
      expect(matchClipboardInvite('abc123')).toEqual({ code: 'ABC123', source: 'code' });
    });

    it('trims surrounding whitespace', () => {
      expect(matchClipboardInvite('  ABC123\n')).toEqual({ code: 'ABC123', source: 'code' });
    });

    it('rejects codes that are too short', () => {
      expect(matchClipboardInvite('ABC12')).toBeNull();
    });

    it('rejects codes that are too long', () => {
      expect(matchClipboardInvite('ABC1234')).toBeNull();
    });

    it('rejects codes with punctuation', () => {
      expect(matchClipboardInvite('ABC-12')).toBeNull();
    });
  });

  describe('join URLs', () => {
    it('matches a custom scheme join link', () => {
      expect(matchClipboardInvite('stoke://join/XYZ789')).toEqual({
        code: 'XYZ789',
        source: 'url',
      });
    });

    it('matches a universal join link', () => {
      expect(matchClipboardInvite('https://stoke-5f762.web.app/join/XYZ789')).toEqual({
        code: 'XYZ789',
        source: 'url',
      });
    });

    it('matches a join link embedded in a longer share message', () => {
      expect(
        matchClipboardInvite('Join me on Stoke: https://stoke-5f762.web.app/join/QRS234')
      ).toEqual({ code: 'QRS234', source: 'url' });
    });
  });

  describe('non-invite clipboard content', () => {
    it('returns null for empty text', () => {
      expect(matchClipboardInvite('')).toBeNull();
    });

    it('returns null for ordinary sentences', () => {
      expect(matchClipboardInvite('See you at dinner tonight')).toBeNull();
    });

    it('returns null for unrelated URLs', () => {
      expect(matchClipboardInvite('https://example.com/join/ABC123')).toBeNull();
    });

    it('returns null for a phone number', () => {
      expect(matchClipboardInvite('555-0192')).toBeNull();
    });
  });
});
