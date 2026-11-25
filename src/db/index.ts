// src/db/index.ts
import type { PoolConfig } from 'pg';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';

import { loadDatabaseUrl } from './database-url';
import { relations } from './relations';

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

const connectionString = loadDatabaseUrl();

const poolConfig: PoolConfig = {
  connectionString,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5000,
};

const pool = new Pool(poolConfig);

pool.on('error', (error) => {
  console.error('Unexpected idle PostgreSQL client error', error);
});

// Merge relations in the required order:
//   1. `defineRelations` — the base relations object
//   2. `defineRelationsPart` results — auth, clinic

export const db = drizzle({
  client: pool,
  relations,
});

export type DB = typeof db;

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type DbTx = Transaction;

// ─────────────────────────────────────────────────────────────────────────────
// Readiness & shutdown
// ─────────────────────────────────────────────────────────────────────────────

let isClosed = false;

export async function checkIsDbReady(): Promise<boolean> {
  if (isClosed) {
    return false;
  }

  try {
    await pool.query('SELECT 1');

    return true;
  } catch (error) {
    console.error('Database readiness check failed', error);

    return false;
  }
}

/** Idempotent: closing an already-closed pool is a no-op. */
export async function closeDb(): Promise<void> {
  if (isClosed) {
    return;
  }

  isClosed = true;

  try {
    await pool.end();
  } catch (error) {
    console.error('Error closing PostgreSQL connection pool', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────────────────────

export type PostgresTransactionConfig = Parameters<typeof db.transaction>[1];

export interface RunWithDbOptions {
  /** Extra attempts after a transient failure. Total tries = maxRetries + 1. */
  maxRetries?: number;
  /** Optional PostgreSQL transaction access mode / isolation level. */
  txConfig?: PostgresTransactionConfig;
}

// PostgreSQL transient / serialization / connection contention SQLSTATE codes:
//   40001 — serialization_failure
//   40P01 — deadlock_detected
//   55P03 — lock_not_available
//   53300 — too_many_connections
//   08006 / 08001 / 08004 — connection failure / inability to connect / rejected
const RETRYABLE_PG_CODES = new Set<string>([
  '40001',
  '40P01',
  '55P03',
  '53300',
  '08006',
  '08001',
  '08004',
]);

const pgErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  cause: z
    .object({
      code: z.string().optional(),
    })
    .optional(),
});

const extractPgCode = (
  error: z.infer<typeof pgErrorSchema>,
): string | undefined => error.code ?? error.cause?.code;

const isRetryableTxError = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- catch boundary error classifier
  error: unknown,
): boolean => {
  const parsed = pgErrorSchema.safeParse(error);

  if (!parsed.success) {
    return false;
  }

  const code = extractPgCode(parsed.data);

  if (code !== undefined && RETRYABLE_PG_CODES.has(code)) {
    return true;
  }

  const message =
    parsed.data.message ?? (error instanceof Error ? error.message : '');

  return /(?<reason>deadlock detected|could not serialize access|lock timeout|connection terminated unexpectedly|too many clients)/iu.test(
    message,
  );
};

const MAX_BACKOFF_MS = 2000;

const delayMs = async (ms: number): Promise<void> => {
  // oxlint-disable-next-line promise/avoid-new -- standard timer sleep helper
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

/**
 * Run an async `fn` inside a PostgreSQL transaction, retrying on transient
 * serialization, deadlock, lock, or connection errors.
 */
export async function withTransaction<T>(
  fn: (tx: Transaction) => Promise<T>,
  options: RunWithDbOptions = {},
): Promise<T> {
  const { maxRetries = 2, txConfig } = options;

  let attempt = 0;

  for (;;) {
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- retry loop requires sequential attempts
      return await db.transaction(fn, txConfig);
    } catch (error: unknown) {
      if (attempt >= maxRetries || !isRetryableTxError(error)) {
        throw error;
      }

      attempt += 1;
      const backoff = Math.min(50 * 2 ** (attempt - 1), MAX_BACKOFF_MS);
      // oxlint-disable-next-line eslint/no-await-in-loop -- backoff wait before retry
      await delayMs(backoff + Math.random() * 50);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports
// ─────────────────────────────────────────────────────────────────────────────

export type { SQL, SQLWrapper } from 'drizzle-orm';

export {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  getTableName,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  not,
  or,
  sql,
} from 'drizzle-orm';

export * from './schema';
