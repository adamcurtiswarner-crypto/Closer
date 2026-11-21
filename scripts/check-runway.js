#!/usr/bin/env node
/**
 * Probes the submission runway against REALITY, daily, and fails loudly.
 *
 * Why this exists: on 2026-11-21 a CEO review found seven days with zero
 * commits, four founder items untouched, a production scheduler failing
 * every day, and another failing every Sunday for a month. Every existing
 * control reported fine:
 *
 *  - `check-submit-by.js` only fails AFTER the date passes, so it was green
 *    through all seven days and would have stayed green until 11/24 itself;
 *  - `checkErrorAlerts` pushed the one admin seven times and nothing
 *    happened, because an alert with one recipient and no response
 *    obligation is a quieter kind of silence;
 *  - CI went red and nobody looked.
 *
 * So this checks the world rather than the record. It cannot be satisfied
 * by someone writing "done" in a file, and it does not depend on anyone
 * reading a push notification.
 *
 * Every probe here is PUBLIC — DNS and HTTPS — so it runs in CI with no
 * credentials. Production-side checks (error_logs, index state) need
 * secrets and deliberately live elsewhere.
 *
 * Exit 0 all clear, 1 one or more probes failed, 2 could not run.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const STATUS = path.join(__dirname, '..', 'STUDIO-STATUS.md');

/** Days of no commits before silence is itself the finding. */
const MAX_SILENT_HOURS = 72;

const failures = [];
const notes = [];

function sh(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', timeout: 20000 }).trim();
  } catch {
    return '';
  }
}

// ── 1. Silence ──────────────────────────────────────────────────────────
// The failure mode this project repeats is not a missed date, it is the
// quiet weeks before one. 2026-09-01 was missed by 74 days; 2026-11-24 had
// seven silent days in front of it.
function checkSilence() {
  const ts = sh('git', ['log', '-1', '--format=%ct']);
  if (!ts) return notes.push('silence: could not read git log');
  const hours = (Date.now() / 1000 - Number(ts)) / 3600;
  if (hours > MAX_SILENT_HOURS) {
    failures.push(
      `SILENCE: no commit for ${Math.floor(hours / 24)} day(s). The runway is open ` +
        `and nothing is moving. This is the failure mode, not a quiet patch.`
    );
  } else {
    notes.push(`silence: last commit ${hours.toFixed(0)}h ago`);
  }
}

// ── 2. A contact address that receives mail ─────────────────────────────
// privacy@ and support@ are published in the app, the policy and the
// marketing site. Without MX they bounce, and a privacy policy naming a
// dead contact is a GDPR/CCPA problem, not a cosmetic one.
function checkMx(domain) {
  const out = sh('dig', ['+short', 'MX', domain]);
  if (!out) {
    failures.push(
      `MX: ${domain} has no MX records — every address published on it bounces.`
    );
  } else {
    notes.push(`MX: ${domain} ok`);
  }
}

// ── 3. The policy Apple actually fetches ────────────────────────────────
// The hosted page is the one App Review reads. It drifted three months
// behind the in-app policy without anyone noticing.
async function checkPolicyFreshness() {
  const url = 'https://stoke.llc/privacy';
  const body = sh('curl', ['-sL', '--max-time', '20', url]);
  if (!body) return failures.push(`POLICY: could not fetch ${url}`);

  const m = body.match(/Last updated:\s*([A-Z][a-z]+ \d{1,2}, \d{4})/);
  if (!m) return failures.push(`POLICY: no "Last updated" line found at ${url}`);

  const published = new Date(m[1]);
  const ageDays = (Date.now() - published.getTime()) / 86400000;
  if (Number.isNaN(published.getTime())) {
    failures.push(`POLICY: unparseable date "${m[1]}" at ${url}`);
  } else if (ageDays > 120) {
    failures.push(
      `POLICY: ${url} still says "${m[1]}" (${Math.floor(ageDays)} days old). ` +
        `This is the page App Review fetches.`
    );
  } else {
    notes.push(`policy: ${m[1]}`);
  }
}

// ── 4. The committed date ───────────────────────────────────────────────
function checkSubmitBy() {
  let text;
  try {
    text = fs.readFileSync(STATUS, 'utf8');
  } catch {
    return failures.push('SUBMIT-BY: cannot read STUDIO-STATUS.md');
  }
  if (/^\s*\*\*SUBMITTED:/m.test(text)) return notes.push('submitted — checks retired');

  const m = text.match(/\*\*SUBMIT-BY:\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) return failures.push('SUBMIT-BY: no committed date in STUDIO-STATUS.md');

  const due = new Date(`${m[1]}T23:59:59Z`);
  const days = Math.floor((due.getTime() - Date.now()) / 86400000);
  if (Date.now() > due.getTime()) {
    failures.push(`SUBMIT-BY: ${m[1]} has passed. Submit, or move it in writing.`);
  } else {
    notes.push(`submit-by: ${days} day(s) to ${m[1]}`);
  }
}

(async () => {
  checkSilence();
  checkMx('stoke.llc');
  await checkPolicyFreshness();
  checkSubmitBy();

  for (const n of notes) console.log(`ok    ${n}`);
  if (failures.length === 0) {
    console.log('\nRunway clear.');
    process.exit(0);
  }

  console.error(`\n${failures.length} runway probe(s) failed:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    '\nThese are checks against the world, not the record. A green status file ' +
      'does not clear them.\n'
  );
  process.exit(1);
})();
