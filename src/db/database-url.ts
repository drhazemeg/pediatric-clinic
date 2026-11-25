import { existsSync } from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';

const serverEnvPath = path.resolve(import.meta.dirname, '../../.env.local');

export function loadDatabaseUrl(): string {
  if (
    (process.env.DATABASE_URL === undefined ||
      process.env.DATABASE_URL === '') &&
    existsSync(serverEnvPath)
  ) {
    dotenv.config({ path: serverEnvPath });
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl === undefined || databaseUrl === '') {
    throw new Error(
      'DATABASE_URL is not set. Add it to Coolify environment variables (or apps/server/.env for local dev).',
    );
  }

  return databaseUrl;
}
