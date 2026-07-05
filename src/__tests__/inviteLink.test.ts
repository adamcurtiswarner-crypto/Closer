import {
  buildInviteLink,
  copyInviteToClipboard,
  extractInviteCode,
  INVITE_LINK_DOMAIN,
} from '@/utils/inviteLink';

const mockSetStringAsync = jest.fn().mockResolvedValue(true);

jest.mock('expo-clipboard', () => ({
  setStringAsync: (value: string) => mockSetStringAsync(value),
}));

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('buildInviteLink', () => {
  it('builds the canonical https link on the hosting domain', () => {
    expect(buildInviteLink('ABC123')).toBe('https://stoke-5f762.web.app/join/ABC123');
  });

  it('uppercases and trims the code', () => {
    expect(buildInviteLink(' abc123 ')).toBe('https://stoke-5f762.web.app/join/ABC123');
  });

  it('uses the exported canonical domain', () => {
    expect(buildInviteLink('XYZ789')).toBe(`https://${INVITE_LINK_DOMAIN}/join/XYZ789`);
  });
});

describe('extractInviteCode', () => {
  describe('current universal link hosts', () => {
    it.each([
      ['https://stoke-5f762.web.app/join/ABC123', 'ABC123'],
      ['https://stoke-5f762.web.app/join/abc123', 'ABC123'],
      ['https://stoke-5f762.web.app/join/ABC123?from=Sam', 'ABC123'],
      ['https://link.getstoke.io/join/XYZ789', 'XYZ789'],
      ['https://link.getstoke.io/join/xyz789', 'XYZ789'],
    ])('parses %s', (url, expected) => {
      expect(extractInviteCode(url)).toBe(expected);
    });
  });

  describe('legacy universal link hosts', () => {
    it.each([
      ['https://stoke.app/join/ABC123', 'ABC123'],
      ['https://closer.app/join/DEF456', 'DEF456'],
    ])('parses %s', (url, expected) => {
      expect(extractInviteCode(url)).toBe(expected);
    });
  });

  describe('custom schemes', () => {
    it.each([
      ['stoke://join/ABC123', 'ABC123'],
      ['stoke://join/abc123', 'ABC123'],
      ['closer://join/GHI789', 'GHI789'],
    ])('parses %s', (url, expected) => {
      expect(extractInviteCode(url)).toBe(expected);
    });
  });

  describe('junk and non-invite URLs', () => {
    it.each([
      [''],
      ['not a url'],
      ['https://example.com/join/ABC123'],
      ['https://stoke-5f762.web.app/other/ABC123'],
      ['https://stoke-5f762.web.app/join/'],
      ['https://stoke-5f762.web.app/join/AB12'],
      ['https://stoke-5f762.web.app/join/TOOLONG123'],
      ['stoke://join/AB-123'],
      ['mailto:hi@getstoke.io'],
    ])('returns null for %s', (url) => {
      expect(extractInviteCode(url)).toBeNull();
    });
  });
});

describe('copyInviteToClipboard', () => {
  beforeEach(() => {
    mockSetStringAsync.mockClear();
  });

  it('writes the full invite link to the clipboard', async () => {
    await copyInviteToClipboard('abc123');
    expect(mockSetStringAsync).toHaveBeenCalledWith('https://stoke-5f762.web.app/join/ABC123');
  });

  it('is a no-op for missing codes', async () => {
    await copyInviteToClipboard(null);
    await copyInviteToClipboard(undefined);
    expect(mockSetStringAsync).not.toHaveBeenCalled();
  });

  it('never throws when the clipboard write fails', async () => {
    mockSetStringAsync.mockRejectedValueOnce(new Error('clipboard unavailable'));
    await expect(copyInviteToClipboard('ABC123')).resolves.toBeUndefined();
  });
});
