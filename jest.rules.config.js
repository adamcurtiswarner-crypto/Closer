/**
 * Jest config for EMULATOR-BACKED security rules tests only.
 *
 * These tests talk to the Firestore + Storage emulators, so they are
 * excluded from the default `npm test` run (see testPathIgnorePatterns in
 * jest.config.js). Run them with:
 *
 *   npm run test:rules
 *
 * which wraps this config in `firebase emulators:exec` so emulators start
 * and stop around the suite.
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  testMatch: ['<rootDir>/src/__tests__/rules/**/*.emulator.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Real timers: the rules test env does actual network I/O to the emulators.
  fakeTimers: { enableGlobally: false },
  testTimeout: 20000,
};
