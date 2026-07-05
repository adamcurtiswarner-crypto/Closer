import * as fs from 'fs';
import * as path from 'path';
import {
  DEFAULT_PROMPT_TIME,
  TIME_OPTIONS,
  getTimeDisplay,
  resolvePromptTime,
} from '../config/promptTime';

describe('promptTime', () => {
  describe('DEFAULT_PROMPT_TIME truth', () => {
    it('is 19:00 (7 PM), the delivery default', () => {
      expect(DEFAULT_PROMPT_TIME).toBe('19:00');
    });

    it('matches the backend fallback in functions/src/prompts.ts', () => {
      // Read-only truth check against the Cloud Function that schedules
      // delivery: `(userData.notification_time || '19:00')`.
      const promptsSource = fs.readFileSync(
        path.join(__dirname, '../../functions/src/prompts.ts'),
        'utf8'
      );
      expect(promptsSource).toContain(
        `notification_time || '${DEFAULT_PROMPT_TIME}'`
      );
    });
  });

  describe('resolvePromptTime', () => {
    it('returns the stored value when present', () => {
      expect(resolvePromptTime('08:00')).toBe('08:00');
      expect(resolvePromptTime('21:00')).toBe('21:00');
    });

    it('falls back to 19:00 when nothing is stored', () => {
      expect(resolvePromptTime(undefined)).toBe('19:00');
      expect(resolvePromptTime(null)).toBe('19:00');
      expect(resolvePromptTime('')).toBe('19:00');
    });
  });

  describe('getTimeDisplay', () => {
    it('shows 7:00 PM for the default', () => {
      expect(getTimeDisplay(resolvePromptTime(undefined))).toBe('7:00 PM');
    });

    it('maps every option value to a human display', () => {
      expect(getTimeDisplay('08:00')).toBe('8:00 AM');
      expect(getTimeDisplay('14:00')).toBe('2:00 PM');
      expect(getTimeDisplay('19:00')).toBe('7:00 PM');
      expect(getTimeDisplay('21:00')).toBe('9:00 PM');
      TIME_OPTIONS.forEach((option) => {
        expect(getTimeDisplay(option.value)).toBe(option.display);
      });
    });

    it('passes unknown stored values through unchanged', () => {
      expect(getTimeDisplay('18:30')).toBe('18:30');
    });
  });
});
