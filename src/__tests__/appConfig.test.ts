import { getShareMessage, getSupportEmailUrl, SUPPORT_EMAIL } from '@/config/app';

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('getShareMessage', () => {
  it('is written in first person and carries the invite link', () => {
    const message = getShareMessage('ABC123');
    expect(message.startsWith('I want to try this with us')).toBe(true);
    expect(message).toContain('https://stoke-5f762.web.app/join/ABC123');
  });

  it('pre-answers the cost and effort objections', () => {
    const message = getShareMessage('ABC123');
    expect(message).toContain('free for you');
    expect(message).toContain('three minutes');
    expect(message).toContain('privately');
  });

  it('contains no exclamation points (brand voice)', () => {
    expect(getShareMessage('ABC123', 'Sam')).not.toContain('!');
  });

  it('appends the inviter first name to the link for join-page personalization', () => {
    const message = getShareMessage('ABC123', 'Sam Warner');
    expect(message).toContain('https://stoke-5f762.web.app/join/ABC123?from=Sam');
    expect(message).not.toContain('Warner');
  });

  it('never uses the third-person "is inviting you" framing', () => {
    expect(getShareMessage('ABC123', 'Sam')).not.toContain('is inviting you');
  });

  it('omits the from param when no name is available', () => {
    for (const name of [undefined, null, '', '   ']) {
      const message = getShareMessage('ABC123', name);
      expect(message).toContain('https://stoke-5f762.web.app/join/ABC123');
      expect(message).not.toContain('from=');
    }
  });
});

describe('getSupportEmailUrl', () => {
  it('targets the support address with the fixed subject', () => {
    const url = getSupportEmailUrl('2.1.0', 'ios');
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    expect(url).toContain(`subject=${encodeURIComponent('Stoke support')}`);
  });

  it('pre-fills only app version and platform in the body', () => {
    const url = getSupportEmailUrl('2.1.0', 'ios');
    const body = decodeURIComponent(url.split('body=')[1]);
    expect(body).toContain('App version: 2.1.0');
    expect(body).toContain('Platform: ios');
    // No user identifiers beyond what the user chooses to send.
    expect(body).not.toMatch(/email|uid|user|couple/i);
  });
});
