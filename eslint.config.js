import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-fixture/**',
      'design-reference/**',
      'handoff-starter/**',
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
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'lucide-react', message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
            { name: 'react-icons', message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
            { name: 'phosphor-react', message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
            { name: 'react-feather', message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
          ],
          patterns: [
            { group: ['@heroicons/*'], message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
            { group: ['@tabler/icons*'], message: 'Icons come only from ICONS in @ai/core through <Icon>.' },
            { group: ['tailwindcss', 'tailwindcss/*'], message: 'No Tailwind. Styling is CSS Modules over tokens.css.' },
            { group: ['styled-components', '@emotion/*'], message: 'No CSS-in-JS runtime. Styling is CSS Modules over tokens.css.' },
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
