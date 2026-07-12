import {
  shouldShowPrePrompt,
  parseExposureCount,
  MAX_PREPROMPT_EXPOSURES,
  type PrePromptGateInput,
} from '../utils/pushPrePrompt';

describe('pushPrePrompt gating', () => {
  const freshUser: PrePromptGateInput = {
    permission: 'undetermined',
    systemPrompted: false,
    exposures: 0,
    offeredThisSession: false,
    trigger: 'first_submit',
    revealUnseen: false,
  };

  describe('shouldShowPrePrompt', () => {
    it('shows after the first submit for a fresh undetermined user', () => {
      expect(shouldShowPrePrompt(freshUser)).toBe(true);
    });

    it('shows at a reveal for a fresh undetermined user (second responder path)', () => {
      expect(shouldShowPrePrompt({ ...freshUser, trigger: 'reveal' })).toBe(true);
    });

    it('never shows when permission is already granted', () => {
      expect(shouldShowPrePrompt({ ...freshUser, permission: 'granted' })).toBe(false);
    });

    it('never shows when permission was denied — the answer is respected', () => {
      expect(shouldShowPrePrompt({ ...freshUser, permission: 'denied' })).toBe(false);
      expect(
        shouldShowPrePrompt({ ...freshUser, permission: 'denied', trigger: 'reveal' })
      ).toBe(false);
    });

    it('never shows again once the system dialog has been spent', () => {
      expect(shouldShowPrePrompt({ ...freshUser, systemPrompted: true })).toBe(false);
      expect(
        shouldShowPrePrompt({ ...freshUser, systemPrompted: true, trigger: 'reveal' })
      ).toBe(false);
    });

    it('shows at most once per session', () => {
      expect(shouldShowPrePrompt({ ...freshUser, offeredThisSession: true })).toBe(false);
      expect(
        shouldShowPrePrompt({ ...freshUser, offeredThisSession: true, trigger: 'reveal' })
      ).toBe(false);
    });

    it('re-offers the dismissed card only at a reveal, not on later submits', () => {
      const dismissedOnce = { ...freshUser, exposures: 1 };
      expect(shouldShowPrePrompt(dismissedOnce)).toBe(false);
      expect(shouldShowPrePrompt({ ...dismissedOnce, trigger: 'reveal' })).toBe(true);
    });

    it('caps lifetime exposures at two — no third ask ever', () => {
      const maxedOut = { ...freshUser, exposures: MAX_PREPROMPT_EXPOSURES };
      expect(shouldShowPrePrompt(maxedOut)).toBe(false);
      expect(shouldShowPrePrompt({ ...maxedOut, trigger: 'reveal' })).toBe(false);
      expect(shouldShowPrePrompt({ ...freshUser, exposures: 5, trigger: 'reveal' })).toBe(false);
    });

    describe('unseen reveal blocks the card (the ceremony owns the screen)', () => {
      it('never shows during an unseen reveal, even for an otherwise eligible user', () => {
        expect(
          shouldShowPrePrompt({ ...freshUser, trigger: 'reveal', revealUnseen: true })
        ).toBe(false);
      });

      it('blocks the first_submit seam too — a submit that completes the day yields', () => {
        expect(shouldShowPrePrompt({ ...freshUser, revealUnseen: true })).toBe(false);
      });

      it('shows again at the reveal seam once the reveal has been seen', () => {
        expect(
          shouldShowPrePrompt({ ...freshUser, trigger: 'reveal', revealUnseen: false })
        ).toBe(true);
        expect(
          shouldShowPrePrompt({
            ...freshUser,
            exposures: 1,
            trigger: 'reveal',
            revealUnseen: false,
          })
        ).toBe(true);
      });
    });
  });

  describe('parseExposureCount', () => {
    it('treats missing storage as zero exposures', () => {
      expect(parseExposureCount(null)).toBe(0);
    });

    it('parses stored counts', () => {
      expect(parseExposureCount('1')).toBe(1);
      expect(parseExposureCount('2')).toBe(2);
    });

    it('treats corrupt or negative values as zero', () => {
      expect(parseExposureCount('junk')).toBe(0);
      expect(parseExposureCount('-3')).toBe(0);
      expect(parseExposureCount('')).toBe(0);
    });
  });
});
