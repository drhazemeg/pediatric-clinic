import pluginQuery from '@tanstack/eslint-plugin-query';
import {defineConfig} from 'oxlint';

export default defineConfig({
  jsPlugins: ['@tanstack/eslint-plugin-query'],
  rules: {
    ...pluginQuery.configs.recommended.rules,
  },
})