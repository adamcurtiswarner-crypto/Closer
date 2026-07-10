// Pin the timezone BEFORE jest boots so date tests are machine-independent
// (they used to pass on US-timezone laptops and fail on UTC CI boxes). Set
// here — not in setupFiles — so every worker process inherits it before any
// Date is constructed. The tz/DST matrix tests assert this pin.
process.env.TZ = 'UTC';

module.exports = {
  preset: '@react-native/jest-preset',

  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|@sentry/react-native|@react-native-google-signin|native-base|react-native-svg|nativewind|date-fns|react-native-worklets)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components$': '<rootDir>/src/components/index.ts',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^react-native-purchases$': '<rootDir>/src/__mocks__/react-native-purchases.ts',
    '^@react-native-community/netinfo$': '<rootDir>/src/__mocks__/@react-native-community/netinfo.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/@react-native-async-storage/async-storage.ts',
    '^@sentry/react-native$': '<rootDir>/src/__mocks__/@sentry/react-native.ts',
    '^@react-native-google-signin/google-signin$': '<rootDir>/src/__mocks__/@react-native-google-signin/google-signin.ts',
    '^expo-apple-authentication$': '<rootDir>/src/__mocks__/expo-apple-authentication.ts',
    '^react-native-worklets(.*)$': '<rootDir>/src/__mocks__/react-native-worklets.ts',
    '^react-native-reanimated$': '<rootDir>/src/__mocks__/react-native-reanimated.ts',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.(ts|tsx)', '**/*.(test|spec).(ts|tsx)'],
  // src/__tests__/rules/ holds emulator-backed security-rules tests; they
  // need the Firebase emulators and run via `npm run test:rules` instead
  // (see jest.rules.config.js).
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/functions/',
    '<rootDir>/.worktrees/',
    '<rootDir>/src/__tests__/rules/',
    // Shared test fixtures — not suites themselves.
    '<rootDir>/src/__tests__/fixtures/',
    // Emulator-backed two-client flow harness; runs via `npm run test:flows`
    // (see jest.flows.config.js).
    '<rootDir>/src/__tests__/flows/',
  ],
  fakeTimers: { enableGlobally: true },
};
