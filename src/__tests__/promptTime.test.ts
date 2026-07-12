import * as fs from 'fs';
import * as path from 'path';
import { DAILY_PROMPT_TIME } from '../config/promptTime';

describe('promptTime', () => {
  describe('DAILY_PROMPT_TIME truth', () => {
    it('is 08:00 — a new question arrives each morning, for everyone', () => {
      expect(DAILY_PROMPT_TIME).toBe('08:00');
    });

    it('matches the backend delivery hour in functions/src/prompts.ts', () => {
      // Read-only truth check against the Cloud Function that schedules
      // delivery: `const DELIVERY_HOUR_LOCAL = 8`.
      const promptsSource = fs.readFileSync(
        path.join(__dirname, '../../functions/src/prompts.ts'),
        'utf8'
      );
      expect(promptsSource).toContain('const DELIVERY_HOUR_LOCAL = 8');

      const [hour, minute] = DAILY_PROMPT_TIME.split(':').map(Number);
      expect(hour).toBe(8);
      expect(minute).toBe(0);
    });

    it('the delivery no longer reads the vestigial notification_time field', () => {
      const promptsSource = fs.readFileSync(
        path.join(__dirname, '../../functions/src/prompts.ts'),
        'utf8'
      );
      expect(promptsSource).not.toContain("notification_time || '19:00'");
    });
  });
});
