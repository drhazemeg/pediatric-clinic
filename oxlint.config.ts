import { tanstackConfig } from '@tanstack/oxlint-config';
import { defineConfig } from 'oxlint';
import antiSlop from 'ultracite/oxlint/anti-slop';
import core from 'ultracite/oxlint/core';
import drizzle from 'ultracite/oxlint/drizzle';
import playwright from 'ultracite/oxlint/playwright';
import react from 'ultracite/oxlint/react';
import shadcn from 'ultracite/oxlint/shadcn';
import tanstack from 'ultracite/oxlint/tanstack';
import vitest from 'ultracite/oxlint/vitest';

export default defineConfig({
  env: {
    ...tanstackConfig.env,
    browser: true,
    node: true,
  },
  extends: [
    core,
    react,
    tanstack,
    vitest,
    playwright,
    drizzle,
    shadcn,
    antiSlop,
    tanstackConfig,
  ],
  ignorePatterns: [
    ...core.ignorePatterns,
    ...tanstackConfig.ignorePatterns,
    '**/.tanstack/**',
    '**/drizzle/**',
    'src/components/ui/**',
    'src/db/migrations/**',
  ],
  jsPlugins: [
    '@tanstack/eslint-plugin-query',
    '@tanstack/eslint-plugin-router',
    'oxlint-plugin-react-doctor',
    { name: 'drizzle', specifier: 'eslint-plugin-drizzle' },
  ],
  options: {
    typeAware: true,
    reportUnusedDisableDirectives: 'warn',
  },
  plugins: [
    'typescript',
    'react',
    'react-perf',
    'jsx-a11y',
    'import',
    'unicorn',
    'promise',
  ],
  rules: {
    'typescript/no-unsafe-type-assertion': 'warn',
    'typescript/strict-boolean-expressions': 'warn',
    'typescript/no-confusing-void-expression': 'off',
    'typescript/strict-void-return': 'off',
    'typescript/no-unnecessary-condition': 'warn',
    'typescript/prefer-nullish-coalescing': 'warn',
    'import/no-cycle': 'error',
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/aria-props': 'error',
    'eslint/func-style': [
      'error',
      'expression',
      {
        allowArrowFunctions: true,
        overrides: { namedExports: 'declaration' },
      },
    ],
    'oxc/no-barrel-file': 'off',
    'typescript/no-floating-promises': 'error',
    'typescript/no-misused-promises': [
      'error',
      { checksVoidReturn: { attributes: false } },
    ],
    'typescript/await-thenable': 'error',
    'react/no-unknown-property': 'error',
    'react/exhaustive-deps': 'warn',
    'typescript/no-unnecessary-type-assertion': 'warn',
    'react/jsx-no-constructed-context-values': 'warn',
    'react-perf/jsx-no-new-object-as-prop': 'warn',
    'react-perf/jsx-no-new-array-as-prop': 'warn',
    '@tanstack/query/exhaustive-deps': 'error',
    'unicorn/filename-case': [
      'error',
      {
        cases: {
          kebabCase: true,
          camelCase: true,
        },
        ignore: ['egyptianNationalFormulary\\.ts$'],
      },
    ],
    '@tanstack/query/no-rest-destructuring': 'warn',
    '@tanstack/router/create-route-property-order': 'warn',
    'react-doctor/no-fetch-in-effect': 'error',
    'react-doctor/no-derived-state': 'warn',
    'drizzle/enforce-delete-with-where': 'off',
    'drizzle/enforce-update-with-where': 'off',
  },
  overrides: [
    {
      files: ['src/db/**/*.ts', 'src/server/**/*.ts', 'src/routes/**/api.*.ts'],
      rules: {
        'drizzle/enforce-delete-with-where': [
          'error',
          { drizzleObjectName: ['db'] },
        ],
        'drizzle/enforce-update-with-where': [
          'error',
          { drizzleObjectName: ['db'] },
        ],
      },
    },
    {
      files: ['src/components/forms/**/*.tsx'],
      rules: {
        'react-perf/jsx-no-new-object-as-prop': 'off',
      },
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        vitest: true,
      },
    },
  ],
});
