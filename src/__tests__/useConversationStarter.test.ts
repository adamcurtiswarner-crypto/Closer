import { getTodayStarter, CONVERSATION_STARTERS } from '@/config/conversationStarters';

describe('getTodayStarter', () => {
  it('returns a valid conversation starter', () => {
    const starter = getTodayStarter('couple-123');
    expect(starter).toBeDefined();
    expect(starter.id).toBeTruthy();
    expect(starter.topic).toBeTruthy();
    expect(CONVERSATION_STARTERS).toContain(starter);
  });

  it('returns the same starter for the same coupleId on the same day', () => {
    const a = getTodayStarter('couple-123');
    const b = getTodayStarter('couple-123');
    expect(a.id).toBe(b.id);
  });

  it('returns different starters for different coupleIds', () => {
    const a = getTodayStarter('couple-aaa');
    const b = getTodayStarter('couple-zzz');
    expect(CONVERSATION_STARTERS).toContain(a);
    expect(CONVERSATION_STARTERS).toContain(b);
  });
});
