import {
  revealSeenKey,
  isSameSessionDeepener,
  deepenerEntranceDelay,
  shouldOfferStagePrompt,
  DEEPENER_MIN_DELAY_AFTER_REVEAL_MS,
  STAGE_PROMPT_MAX_VIEWS,
} from '../utils/revealGate';

describe('revealGate', () => {
  describe('revealSeenKey', () => {
    it('namespaces the key by assignment id', () => {
      expect(revealSeenKey('abc123')).toBe('reveal_seen_abc123');
    });
  });

  describe('isSameSessionDeepener (the dwell gate predicate)', () => {
    const deepener = {
      assignmentKind: 'follow_up',
      followUp: { branch: 'deepener', parentAssignmentId: 'parent-1' },
    };

    it('matches a deepener follow-up whose parent is the held reveal', () => {
      expect(isSameSessionDeepener(deepener, 'parent-1')).toBe(true);
    });

    it('does not match when no reveal is held (fresh session / re-entry)', () => {
      expect(isSameSessionDeepener(deepener, null)).toBe(false);
      expect(isSameSessionDeepener(deepener, undefined)).toBe(false);
    });

    it('does not match a deepener from a different parent assignment', () => {
      expect(isSameSessionDeepener(deepener, 'other-parent')).toBe(false);
    });

    it('does not match next-day follow-up branches (repair/divergence)', () => {
      const repair = {
        assignmentKind: 'follow_up',
        followUp: { branch: 'repair', parentAssignmentId: 'parent-1' },
      };
      const divergence = {
        assignmentKind: 'follow_up',
        followUp: { branch: 'divergence', parentAssignmentId: 'parent-1' },
      };
      expect(isSameSessionDeepener(repair, 'parent-1')).toBe(false);
      expect(isSameSessionDeepener(divergence, 'parent-1')).toBe(false);
    });

    it('does not match daily assignments', () => {
      const daily = { assignmentKind: 'daily', followUp: null };
      expect(isSameSessionDeepener(daily, 'parent-1')).toBe(false);
    });

    it('does not match when assignment is missing', () => {
      expect(isSameSessionDeepener(null, 'parent-1')).toBe(false);
      expect(isSameSessionDeepener(undefined, 'parent-1')).toBe(false);
    });
  });

  describe('deepenerEntranceDelay', () => {
    it('delays the full window when the deepener arrives at reveal mount', () => {
      expect(deepenerEntranceDelay(1000, 1000)).toBe(DEEPENER_MIN_DELAY_AFTER_REVEAL_MS);
    });

    it('delays only the remaining time when the reveal has been dwelled on', () => {
      expect(deepenerEntranceDelay(1000, 2000)).toBe(DEEPENER_MIN_DELAY_AFTER_REVEAL_MS - 1000);
    });

    it('enters immediately once the minimum dwell has elapsed', () => {
      expect(deepenerEntranceDelay(1000, 1000 + DEEPENER_MIN_DELAY_AFTER_REVEAL_MS)).toBe(0);
      expect(deepenerEntranceDelay(1000, 60000)).toBe(0);
    });

    it('never returns a negative delay for a clock skewed backwards', () => {
      expect(deepenerEntranceDelay(5000, 4000)).toBe(DEEPENER_MIN_DELAY_AFTER_REVEAL_MS);
    });
  });

  describe('shouldOfferStagePrompt', () => {
    it('offers when never dismissed and under the view cap', () => {
      expect(shouldOfferStagePrompt(false, 0)).toBe(true);
      expect(shouldOfferStagePrompt(false, STAGE_PROMPT_MAX_VIEWS - 1)).toBe(true);
    });

    it('stops offering once dismissed', () => {
      expect(shouldOfferStagePrompt(true, 0)).toBe(false);
    });

    it('auto-stops after the maximum number of unanswered views', () => {
      expect(shouldOfferStagePrompt(false, STAGE_PROMPT_MAX_VIEWS)).toBe(false);
      expect(shouldOfferStagePrompt(false, STAGE_PROMPT_MAX_VIEWS + 5)).toBe(false);
    });
  });
});
