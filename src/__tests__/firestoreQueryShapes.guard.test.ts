/**
 * Structural guard: `where(documentId(), 'in', [...])` is banned in client
 * hooks.
 *
 * Firestore fans that query out into per-key lookups and evaluates the rules
 * once per key — INCLUDING keys with no document. `resource` is null, any
 * rule that dereferences `resource.data` raises an evaluation error, and the
 * WHOLE query comes back permission-denied. A `where('couple_id','==',…)`
 * filter does not protect it; that filter is applied after rules evaluation.
 * There is a second, independent cap around 20 keys.
 *
 * Both of the app's call sites (useOpenDays, useYourWords) were broken from
 * the day they shipped, and neither could be caught by a single-doc get()
 * test. Open Days never worked once; Your Words showed answers with no
 * questions for both founders.
 *
 * A mobile client can almost never guarantee that an id list is all-present
 * and under 20, so the shape is banned outright. Query by a VALUE field
 * instead — the result set can then only contain documents that exist.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');
const HOOKS = path.join(SRC, 'hooks');
const APP = path.join(SRC, '..', 'app');

const BANNED = /documentId\(\)\s*,\s*['"]in['"]/;

/**
 * Comments are stripped first — the ban is on the query, not on writing
 * about it. Both fixed hooks explain the defect in prose that quotes the
 * old shape verbatim, and that explanation is the most valuable part of
 * the fix.
 */
function code(file: string): string {
  return fs
    .readFileSync(path.join(HOOKS, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function hookFiles(): string[] {
  return fs
    .readdirSync(HOOKS)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
}

/** Every .ts/.tsx file under a directory, recursively, excluding tests. */
function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__mocks__') return [];
      return walk(full);
    }
    if (!/\.tsx?$/.test(entry.name)) return [];
    return [full];
  });
}

function sourceWithoutComments(full: string): string {
  return fs
    .readFileSync(full, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('client query shapes', () => {
  it('no hook queries by documentId() in a list', () => {
    expect(hookFiles().filter((file) => BANNED.test(code(file)))).toEqual([]);
  });

  it('no file anywhere in the client queries by documentId() in a list', () => {
    // The original guard scanned src/hooks only, so the same defect in
    // app/, src/components or src/services would have passed it. Firestore
    // queries live outside hooks too (TryThisCard writes directly).
    const offenders = [...walk(SRC), ...walk(APP)]
      .filter((full) => BANNED.test(sourceWithoutComments(full)))
      .map((full) => path.relative(SRC, full));

    expect(offenders).toEqual([]);
  });

  it('detects the banned shape when it is real code', () => {
    // A guard that cannot fail is not a guard.
    expect(BANNED.test("where(documentId(), 'in', ids)")).toBe(true);
    expect(BANNED.test('where(documentId(), "in", ids)')).toBe(true);
    expect(BANNED.test("where('assignment_id', 'in', ids)")).toBe(false);
  });
});

/**
 * Structural guard: every realtime listener reports its errors.
 *
 * An `onSnapshot` without an error callback fails silently — the screen
 * keeps rendering whatever it had, and no telemetry is written. That is the
 * mechanism (not the bug) behind all three of 2026's long outages: the
 * 20-day `documentId() in` denial, the 24-day BigQuery failure, and the
 * four-day scheduler failure. On 2026-11-14 the two listeners driving the
 * entire Today screen still had no error callback.
 *
 * `onSnapshot(query, onNext, onError)` — so the call must pass more than two
 * arguments. Matching is deliberately shallow and errs toward flagging:
 * a listener that needs an exemption should be given one explicitly here.
 */
describe('realtime listeners report their errors', () => {
  const ONSNAPSHOT = /onSnapshot\s*\(/g;

  /** Extract the argument source of each onSnapshot call, brace-balanced. */
  function onSnapshotCalls(src: string): string[] {
    const calls: string[] = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(ONSNAPSHOT.source, 'g');
    while ((match = re.exec(src)) !== null) {
      let depth = 0;
      let i = match.index + match[0].length - 1;
      const start = i + 1;
      for (; i < src.length; i++) {
        if (src[i] === '(') depth++;
        else if (src[i] === ')') {
          depth--;
          if (depth === 0) break;
        }
      }
      calls.push(src.slice(start, i));
    }
    return calls;
  }

  /** Top-level comma count, ignoring nested parens/braces/brackets. */
  function topLevelArgCount(args: string): number {
    let depth = 0;
    let count = 1;
    for (const ch of args) {
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth--;
      else if (ch === ',' && depth === 0) count++;
    }
    return args.trim() === '' ? 0 : count;
  }

  it('every onSnapshot in the client passes an error callback', () => {
    const offenders: string[] = [];

    for (const full of [...walk(SRC), ...walk(APP)]) {
      const src = sourceWithoutComments(full);
      if (!src.includes('onSnapshot')) continue;
      for (const args of onSnapshotCalls(src)) {
        if (topLevelArgCount(args) < 3) {
          offenders.push(path.relative(SRC, full));
        }
      }
    }

    expect([...new Set(offenders)]).toEqual([]);
  });

  it('flags a two-argument listener', () => {
    // A guard that cannot fail is not a guard.
    const bad = 'const u = onSnapshot(q, (snap) => { use(snap, [1, 2]); });';
    const good = 'const u = onSnapshot(q, (snap) => {}, (e) => report(e));';
    const [badArgs] = onSnapshotCalls(bad);
    const [goodArgs] = onSnapshotCalls(good);

    expect(topLevelArgCount(badArgs)).toBe(2);
    expect(topLevelArgCount(goodArgs)).toBe(3);
  });
});
