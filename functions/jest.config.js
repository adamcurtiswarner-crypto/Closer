// Pin the timezone BEFORE jest boots so date tests are machine-independent
// (mirrors app/jest.config.js). The tz/DST matrix tests assert this pin.
process.env.TZ = 'UTC';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(@firebase|firebase-functions|firebase-admin)/)',
  ],
};
