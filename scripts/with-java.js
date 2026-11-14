#!/usr/bin/env node
/**
 * Runs a command with a working Java on PATH.
 *
 * Why this exists (2026-11-14): the Firestore emulator needs a JRE, and
 * `npm run test:rules` died on a stock machine with "Unable to locate a Java
 * Runtime" — /usr/bin/java on macOS is a stub, and the Homebrew openjdk that
 * was installed is keg-only and unlinked. That was documented nowhere, so
 * the rules suite simply stopped being run: by the time anyone forced it, it
 * had drifted red against the live rules. Rules are the one surface a unit
 * test cannot see, and a suite nobody can run is zero coverage on it — the
 * exact condition behind the 20-day permission-denied outage.
 *
 * Resolution order: an existing working `java`, then $JAVA_HOME, then
 * /usr/libexec/java_home (real JDKs only), then the usual Homebrew and
 * Linux locations. If none works, it exits with an actionable message
 * instead of the emulator's opaque failure.
 *
 * Usage: node scripts/with-java.js <command> [args...]
 */
const { spawnSync, spawnSync: run } = require('child_process');
const fs = require('fs');
const path = require('path');

/** Does this directory hold a java that actually runs? */
function works(binDir) {
  const java = path.join(binDir, process.platform === 'win32' ? 'java.exe' : 'java');
  if (!fs.existsSync(java)) return false;
  const probe = run(java, ['-version'], { stdio: 'ignore' });
  return probe.status === 0;
}

function candidateDirs() {
  const dirs = [];

  if (process.env.JAVA_HOME) dirs.push(path.join(process.env.JAVA_HOME, 'bin'));

  // macOS: ask the system, but only trust it if it returns a real JDK.
  if (process.platform === 'darwin') {
    const home = run('/usr/libexec/java_home', [], { encoding: 'utf8' });
    if (home.status === 0 && home.stdout) {
      dirs.push(path.join(home.stdout.trim(), 'bin'));
    }
    dirs.push(
      '/opt/homebrew/opt/openjdk/bin',
      '/opt/homebrew/opt/openjdk@21/bin',
      '/opt/homebrew/opt/openjdk@17/bin',
      '/usr/local/opt/openjdk/bin'
    );
  }

  // Linux / CI runners (actions/setup-java exports JAVA_HOME, handled above).
  dirs.push('/usr/lib/jvm/default-java/bin', '/usr/lib/jvm/java-21-openjdk/bin');

  return dirs.filter(Boolean);
}

function resolveJavaBin() {
  // Already on PATH and functional? Nothing to do — this is the CI case.
  const onPath = run(process.platform === 'win32' ? 'where' : 'which', ['java'], {
    encoding: 'utf8',
  });
  if (onPath.status === 0 && onPath.stdout.trim()) {
    const probe = run('java', ['-version'], { stdio: 'ignore' });
    if (probe.status === 0) return null; // use PATH as-is
  }

  for (const dir of candidateDirs()) {
    if (works(dir)) return dir;
  }
  return undefined; // nothing found
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('with-java: no command given');
  process.exit(2);
}

const javaBin = resolveJavaBin();

if (javaBin === undefined) {
  console.error(
    [
      '',
      'No usable Java runtime found, and the Firestore emulator requires one.',
      '',
      'Install it with:   brew install openjdk',
      'Homebrew keeps openjdk keg-only, so it will not be on PATH — that is',
      'fine, this wrapper finds it at /opt/homebrew/opt/openjdk/bin.',
      'On CI, use actions/setup-java (it exports JAVA_HOME).',
      '',
    ].join('\n')
  );
  process.exit(1);
}

const env = { ...process.env };
if (javaBin) {
  env.PATH = `${javaBin}${path.delimiter}${env.PATH}`;
  env.JAVA_HOME = path.dirname(javaBin);
}

const result = spawnSync(command, args, { stdio: 'inherit', env, shell: true });
process.exit(result.status === null ? 1 : result.status);
