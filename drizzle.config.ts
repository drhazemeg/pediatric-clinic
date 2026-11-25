import { defineConfig } from 'drizzle-kit';

import { loadDatabaseUrl } from './src/db/database-url';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  breakpoints: true,
  verbose: true,
  dbCredentials: {
    url: loadDatabaseUrl(),
  },
});
