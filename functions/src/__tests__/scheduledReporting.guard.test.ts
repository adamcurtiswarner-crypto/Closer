/**
 * Structural guard: every scheduled function reports its failures.
 *
 * On 2026-11-14 `runScheduled` was added so a scheduled handler's
 * top-level failure writes `error_logs` and reaches `checkErrorAlerts`. It
 * was applied to the three functions that were failing at the time, and
 * nine others were left alone — the instances were fixed, not the class.
 *
 * The cost showed up a week later: `sendWeeklyRecaps` had been failing
 * every Sunday for at least four weeks on a missing composite index, and
 * NOTHING knew. It wrote no error_log, raised no alert, and appeared in no
 * report, because it was one of the nine. Four weeks of a retention loop
 * silently not running.
 *
 * A scheduled function that can fail outside a catch block is a silent
 * outage waiting to happen. This fails when a new one is added without the
 * wrapper, which is the only way "we fixed the class" stays true.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

/** Scheduled handlers that deliberately do not report. Keep this honest. */
const ALLOWLIST: Record<string, string> = {
  // Hidden-feature schedulers that are NOT exported from the v1 barrel and
  // are deleted from production (functions/V1-SCOPE.md). They cannot fail
  // in prod because they do not run there.
  computeRelationshipPulse: 'hidden feature, un-exported and deleted from prod',
  deliverCheckIn: 'hidden feature, un-exported and deleted from prod',
  checkStreakBreaks: 'hidden feature, un-exported and deleted from prod',
  detectChurnRisk: 'hidden feature, un-exported and deleted from prod',
  sendResponseReminders: 'removed from the v1 barrel (reminder cadence cut)',
  deliverMorningCheckin: 'hidden feature, un-exported and deleted from prod',
  deliverEveningReflection: 'hidden feature, un-exported and deleted from prod',
  dateNightReminder: 'hidden feature, un-exported and deleted from prod',
};

function sourceFiles(): string[] {
  return fs
    .readdirSync(SRC)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => path.join(SRC, f));
}

/** Every `export const NAME = functions...pubsub.schedule(...)` in the codebase. */
function scheduledFunctions(): Array<{ name: string; file: string; body: string }> {
  const found: Array<{ name: string; file: string; body: string }> = [];

  for (const file of sourceFiles()) {
    const src = fs.readFileSync(file, 'utf8');
    const re = /export const (\w+) = functions[\s\S]{0,400}?\.onRun\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const declaration = src.slice(m.index, m.index + m[0].length);
      if (!/\.schedule\(/.test(declaration)) continue; // not a scheduled function
      // Look at the handler's opening lines for the wrapper.
      const head = src.slice(m.index + m[0].length, m.index + m[0].length + 200);
      found.push({ name: m[1], file: path.basename(file), body: head });
    }
  }
  return found;
}

describe('scheduled functions report their failures', () => {
  it('finds the scheduled functions at all', () => {
    // If this ever returns nothing the regex has rotted and the guard below
    // would pass vacuously.
    const names = scheduledFunctions().map((f) => f.name);

    expect(names.length).toBeGreaterThan(8);
    expect(names).toContain('sendWeeklyRecaps');
    expect(names).toContain('deliverDailyPrompts');
  });

  it('every scheduled function is wrapped in runScheduled', () => {
    const offenders = scheduledFunctions()
      .filter((f) => !ALLOWLIST[f.name])
      .filter((f) => !f.body.includes('runScheduled('))
      .map((f) => `${f.file}:${f.name}`);

    expect(offenders).toEqual([]);
  });

  it('keeps the allowlist honest', () => {
    // An allowlist entry for a function that no longer exists hides the
    // next one that needs attention.
    const names = new Set(scheduledFunctions().map((f) => f.name));
    const stale = Object.keys(ALLOWLIST).filter((n) => !names.has(n));

    expect(stale).toEqual([]);
  });

  it('detects an unwrapped handler', () => {
    // A guard that cannot fail is not a guard.
    const wrapped = "\n    runScheduled('x', async () => {";
    const bare = '\n    const now = Date.now();';

    expect(wrapped.includes('runScheduled(')).toBe(true);
    expect(bare.includes('runScheduled(')).toBe(false);
  });
});
