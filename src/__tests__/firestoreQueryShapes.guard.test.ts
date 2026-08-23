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

const HOOKS = path.join(__dirname, '..', 'hooks');

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

describe('client query shapes', () => {
  it('no hook queries by documentId() in a list', () => {
    expect(hookFiles().filter((file) => BANNED.test(code(file)))).toEqual([]);
  });

  it('detects the banned shape when it is real code', () => {
    // A guard that cannot fail is not a guard.
    expect(BANNED.test("where(documentId(), 'in', ids)")).toBe(true);
    expect(BANNED.test('where(documentId(), "in", ids)')).toBe(true);
    expect(BANNED.test("where('assignment_id', 'in', ids)")).toBe(false);
  });
});
