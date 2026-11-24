import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const ICON_PATHS = [
  { name: 'lucide-react', message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
  { name: 'react-icons', message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
  { name: 'phosphor-react', message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
  { name: 'react-feather', message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
];
const STYLE_PATTERNS = [
  { group: ['@heroicons/*'], message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
  { group: ['@tabler/icons*'], message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
  { group: ['tailwindcss', 'tailwindcss/*'], message: 'No Tailwind. Styling is CSS Modules over tokens.css.' },
  { group: ['styled-components', '@emotion/*'], message: 'No CSS-in-JS runtime. Styling is CSS Modules over tokens.css.' },
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-fixture/**',
      // D-182: the flag-on fixture build (`build:fixture:v2`).
      '**/dist-fixture-v2/**',
      // D-241: the production build the buyer's mockup-vs-build pairs are captured from (handoff/lms-mockup/tools/pairs.ts).
      '**/dist-buyer/**',
      'design-reference/**',
      'handoff-starter/**',
      // The v6 step page's design handoff (D-210), kept verbatim: its mockup, harness and diff tools.
      'handoff/**',
      // Design handoffs kept verbatim for reference (the mockup's own markup, styles and script).
      'docs/design/**/handoff/**',
      'compliance/goldens/**',
      'compliance/report/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/*.d.mts',
      // The free skills' sources (D-052): what Claude and ChatGPT read, plus the scripts that made their
      // practice and test files. `node scripts/skills.mjs check` is their linter.
      'skills/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,js,mjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-restricted-imports': ['error', { paths: ICON_PATHS, patterns: STYLE_PATTERNS }],
    },
  },
  {
    // D-173: course content is data. Runtime code (web, API and core) may not import the one-time
    // seed (packages/core/seed) or the old content modules; tests and the seed CLI may. The copy guard
    // test (apps/api/test/copy-guard.test.ts) also checks that no seed string is written into runtime.
    files: ['apps/web/src/**/*.{ts,tsx}', 'apps/api/src/**/*.ts', 'packages/core/src/**/*.ts'],
    // The seed CLI and its one-time data steps (D-175) are deploy-time tooling, never the server's runtime.
    // A `test/` folder holds a test's own data (D-177's learner fixture), as the copy guard reads it.
    ignores: ['**/*.test.{ts,tsx}', '**/test/**', 'apps/api/src/db/seed.ts', 'apps/api/src/db/data-migrations.ts', 'apps/web/src/test-setup.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ICON_PATHS,
          patterns: [
            ...STYLE_PATTERNS,
            {
              group: ['@ai/core/seed/*', '**/core/seed/*', '../seed/*', '**/accelerator-content', '**/weeks-0-3', '**/weeks-0-3.ts'],
              message: 'D-173: course content is data. Runtime code reads it from the database; the seed is for db:curriculum:ensure and tests only.',
            },
          ],
        },
      ],
    },
  },
  {
    // packages/core is pure: no browser globals, no Date.now outside the injectable Ctx.
    files: ['packages/core/src/**/*.ts'],
    ignores: ['packages/core/src/constants.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'packages/core is pure. Browser APIs belong in apps/web.' },
        { name: 'document', message: 'packages/core is pure. Browser APIs belong in apps/web.' },
        { name: 'localStorage', message: 'packages/core is pure. Browser APIs belong in apps/web.' },
        { name: 'sessionStorage', message: 'packages/core is pure. Browser APIs belong in apps/web.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Time is passed in as `now`. Use Ctx.now, never Date.now(), in packages/core.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'Ids must be deterministic. Use Ctx.id, never Math.random(), in packages/core.',
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'apps/*/build.mjs', 'compliance/**/*.ts', '**/*.config.{ts,js,mjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        structuredClone: 'readonly',
      },
    },
    rules: { '@typescript-eslint/no-explicit-any': 'off', 'no-console': 'off' },
  },
);
