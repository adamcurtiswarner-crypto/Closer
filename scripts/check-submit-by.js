#!/usr/bin/env node
/**
 * Fails once the committed SUBMIT-BY date in STUDIO-STATUS.md has passed.
 *
 * Why this exists: the submission date has now been missed twice without
 * anyone being told. 2026-09-01 was committed in writing on 2026-08-22 and
 * was 74 days stale before this cycle noticed, while feature work carried on
 * against it. The 2026-08-22 plan already called for this exact check
 * ("a scheduled GitHub Action that fails when the date passes") and it was
 * never built — which is why `.github/workflows/ci.yml` being push-only
 * mattered: with zero pushes for 19 days it ran zero times, so anything hung
 * off it was equally silent.
 *
 * The date is READ FROM the status file rather than duplicated here, so the
 * control and the record cannot drift apart. Moving the date means editing
 * the one line that governance requires you to edit anyway.
 *
 * Exit codes: 0 on time (or already submitted), 1 past due, 2 unparseable.
 */
const fs = require('fs');
const path = require('path');

const STATUS = path.join(__dirname, '..', 'STUDIO-STATUS.md');

// Matches: **SUBMIT-BY: 2026-11-24 (committed) · target Fri 2026-11-21.**
const LINE = /\*\*SUBMIT-BY:\s*(\d{4}-\d{2}-\d{2})/;

// Set once the app is actually submitted, to retire the check.
const SUBMITTED = /^\s*\*\*SUBMITTED:/m;

function main() {
  let text;
  try {
    text = fs.readFileSync(STATUS, 'utf8');
  } catch (error) {
    console.error(`check-submit-by: cannot read ${STATUS}: ${error.message}`);
    return 2;
  }

  if (SUBMITTED.test(text)) {
    console.log('check-submit-by: STUDIO-STATUS.md records a submission — check retired.');
    return 0;
  }

  const match = text.match(LINE);
  if (!match) {
    console.error(
      'check-submit-by: no "**SUBMIT-BY: YYYY-MM-DD" line found in STUDIO-STATUS.md.\n' +
        'That line is the committed submission date and governance depends on it. ' +
        'Restore it, or add a "**SUBMITTED:" line if the app has shipped.'
    );
    return 2;
  }

  const due = new Date(`${match[1]}T23:59:59Z`);
  const now = new Date();
  const days = Math.floor((due.getTime() - now.getTime()) / 86400000);

  if (now > due) {
    console.error(
      [
        '',
        `SUBMIT-BY ${match[1]} has passed (${Math.abs(days)} day(s) ago).`,
        '',
        'Per the governance rule in STUDIO-STATUS.md, the studio does not open',
        'feature work while a submission runway is open unless the CEO moves',
        'this date IN WRITING in that file first. Either submit, or move the',
        'date and say why. Do not leave it stale — that is the failure this',
        'check exists to prevent, and it has already happened twice.',
        '',
      ].join('\n')
    );
    return 1;
  }

  console.log(`check-submit-by: ${days} day(s) until SUBMIT-BY ${match[1]}.`);
  return 0;
}

process.exit(main());
