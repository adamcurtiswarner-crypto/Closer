/**
 * Jest config for the EMULATOR-BACKED two-client flow harness.
 *
 * These tests drive the firebase WEB SDK (the same package the app uses)
 * against the local emulators — Auth :9099, Firestore :8080, Functions :5001
 * (per firebase.json) — with two authenticated users exercising the EXACT
 * query/write shapes from src/hooks. They are excluded from `npm test`
 * (see testPathIgnorePatterns in jest.config.js). Run them with:
 *
 *   npm run test:flows
 *
 * which builds functions/ and wraps this config in `firebase emulators:exec`
 * so the emulators (including compiled Cloud Functions triggers/callables)
 * start and stop around the suite. Needs Java, same as test:rules:
 *
 *   export JAVA_HOME=/opt/homebrew/opt/openjdk PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
 *
 * `npm run test:integration` runs test:rules + test:flows back to back.
 */

// Machine-independent dates: same TZ pin as jest.config.js.
process.env.TZ = 'UTC';

module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  testMatch: ['<rootDir>/src/__tests__/flows/**/*.flow.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Real timers + real network I/O against the emulators.
  fakeTimers: { enableGlobally: false },
  // 120s so a waitFor (45s on CI) always expires FIRST and reports what it
  // was waiting for. When these were both 60s, jest won the race and every
  // failure arrived as a bare "Exceeded timeout" with no clue attached.
  testTimeout: 120000,
  // All files share one emulator instance; run serially for determinism.
  maxWorkers: 1,
  // Retries one intermittent emulator/gRPC flake (see flows/setup.ts) so a
  // known-unstable test cannot hold CI permanently red. A real break still
  // fails all three attempts.
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/flows/setup.ts'],
  // The web SDK keeps gRPC/listen channels open; the harness owns process
  // lifetime inside emulators:exec, so exit once the suites finish.
  forceExit: true,
};
