import { defineConfig } from 'oxfmt';
import ultracite from 'ultracite/oxfmt';

export default defineConfig({
  ...ultracite,
  singleQuote: true,
  jsxSingleQuote: false,
  semi: true,
  trailingComma: 'all',
  arrowParens: 'always',
  endOfLine: 'lf',
  insertFinalNewline: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSameLine: false,
  bracketSpacing: true,
  sortImports: {
    groups: [
      'type',
      'builtin',
      'external',
      'internal',
      ['parent', 'sibling', 'index'],
      'style',
      'unknown',
    ],
    internalPattern: ['@/', '#/'],
    newlinesBetween: true,
  },
  sortTailwindcss: {
    stylesheet: './src/styles.css',
    functions: ['cn', 'clsx', 'cva', 'tv'],
  },
  sortPackageJson: true,
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    '**/.tanstack/**',
    '**/*.min.*',
    'src/db/migrations/**',
  ],
});
