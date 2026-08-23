/**
 * Structural guard: push sends stay funnelled through one place.
 *
 * `member_ids` was fanned out by hand in eight functions, and two of them
 * shipped without a status check. The result was a fresh daily prompt
 * assigned to long-deleted couples and pushed to both ex-partners for weeks
 * (2026-08-23) — twice, months apart, by different code.
 *
 * notifyCoupleMembers() is now the only sanctioned way to notify both halves
 * of a couple. This test does not check style; it makes the next person who
 * writes a raw push choose to add themselves to a list with a reason
 * attached, which is the moment the missing status check becomes visible.
 *
 * If this test fails, the fix is almost always "use notifyCoupleMembers",
 * not "add the file to the list".
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

/** Every file allowed to call sendPushNotification directly, and why. */
const DIRECT_PUSH_ALLOWLIST: Record<string, string> = {
  'shared.ts':
    'defines sendPushNotification and notifyCoupleMembers — the choke point itself',
  'notifications.ts':
    'response reminders decide per member (quiet hours, reminder count, ' +
    'set-aside), so this is not a uniform fan-out; couple status is checked ' +
    'via isActiveCouple',
  'triggers.ts':
    'person-to-person events — notifies the PARTNER of the acting member, ' +
    'never the roster; a dissolved couple has an empty roster and yields no ' +
    'partner',
  'users.ts':
    'unlink and account deletion tell the partner the couple has ended — the ' +
    'one case that must fire exactly as the couple dissolves',
  'alerting.ts': 'operational alerts to /admins, not to couples',
  'engines.ts': 'single-user engine nudges addressed to one member by id',
};

function sourceFiles(): string[] {
  return fs
    .readdirSync(SRC)
    .filter((f) => f.endsWith('.ts'))
    .filter((f) => !f.endsWith('.d.ts'));
}

describe('push fan-out stays behind notifyCoupleMembers', () => {
  it('no unlisted file calls sendPushNotification directly', () => {
    const offenders = sourceFiles().filter((file) => {
      if (file in DIRECT_PUSH_ALLOWLIST) return false;
      return fs
        .readFileSync(path.join(SRC, file), 'utf8')
        .includes('sendPushNotification(');
    });

    expect(offenders).toEqual([]);
  });

  it('every allowlisted file still exists and still pushes', () => {
    // Keeps the list honest: a stale entry is a licence nobody is using.
    for (const [file, reason] of Object.entries(DIRECT_PUSH_ALLOWLIST)) {
      const full = path.join(SRC, file);
      expect({ file, exists: fs.existsSync(full) }).toEqual({ file, exists: true });
      expect({ file, pushes: fs.readFileSync(full, 'utf8').includes('sendPushNotification(') })
        .toEqual({ file, pushes: true });
      expect(reason.length).toBeGreaterThan(20);
    }
  });

  it('no file loops the roster straight into a push', () => {
    // The exact shape of both production defects: iterate member_ids, push
    // inside the loop, no status check anywhere.
    const pattern =
      /for\s*\(\s*const\s+\w+\s+of\s+[^)]*member_ids[^)]*\)\s*\{[^}]*sendPushNotification/s;

    const offenders = sourceFiles().filter((file) =>
      pattern.test(fs.readFileSync(path.join(SRC, file), 'utf8'))
    );

    expect(offenders).toEqual([]);
  });
});
