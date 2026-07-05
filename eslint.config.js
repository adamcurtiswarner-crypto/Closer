// Design-token guardrails ONLY — this is intentionally NOT a full lint setup.
//
// Two rules, enforced on every UI file:
//   1. No raw hex color literals outside src/config/theme.ts — use theme tokens.
//   2. No `fontSize:` property outside src/config/theme.ts — use a typography
//      preset (`...typography.X`).
//
// Severity is "warn" because hidden (feature-flagged) screens still carry
// violations; all v1-visible surfaces are clean. Tighten to "error" once the
// hidden screens are swept.
const tsParser = require('@typescript-eslint/parser');

const designTokenRules = {
  'no-restricted-syntax': [
    'warn',
    {
      selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
      message:
        'Raw hex colors are banned outside src/config/theme.ts — use a color token from @/config/theme.',
    },
    {
      selector: "Property[key.name='fontSize']",
      message:
        'fontSize is banned outside src/config/theme.ts — spread a typography preset (...typography.X) instead.',
    },
  ],
};

module.exports = [
  {
    files: ['app/**/*.tsx', 'src/components/**/*.tsx', 'src/screens/**/*.tsx'],
    ignores: ['**/__tests__/**', '**/__mocks__/**'],
    linterOptions: {
      // Disable comments for rules outside this minimal config are expected.
      reportUnusedDisableDirectives: 'off',
    },
    // Stub so existing `eslint-disable react-hooks/exhaustive-deps` comments
    // don't error — this config deliberately doesn't lint hooks.
    plugins: {
      'react-hooks': { rules: { 'exhaustive-deps': { create: () => ({}) } } },
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: designTokenRules,
  },
];
