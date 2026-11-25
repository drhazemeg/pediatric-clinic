// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import { loadDatabaseUrl } from "./database-url";
import { relations } from "./relations";

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

const connectionString = loadDatabaseUrl();

const poolConfig: PoolConfig = {
	connectionString,
	max: 20,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 5_000
};

const pool = new Pool(poolConfig);

pool.on("error", error => {
	console.error("Unexpected idle PostgreSQL client error", error);
});

// Merge relations in the required order:
//   1. `defineRelations` — the base relations object
//   2. `defineRelationsPart` results — auth, clinic

export const db = drizzle({
	client: pool,
	relations
});

export type DB = typeof db;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbTx = Transaction;

// ─────────────────────────────────────────────────────────────────────────────
// Readiness & shutdown
// ─────────────────────────────────────────────────────────────────────────────

let isClosed = false;

export async function checkIsDbReady(): Promise<boolean> {
	if (isClosed) return false;
	try {
		await pool.query("SELECT 1");
		return true;
	} catch (error) {
		console.error("Database readiness check failed", error);
		return false;
	}
}

/** Idempotent: closing an already-closed pool is a no-op. */
export async function closeDb(): Promise<void> {
	if (isClosed) return;
	isClosed = true;

	try {
		await pool.end();
	} catch (error) {
		console.error("Error closing PostgreSQL connection pool", error);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────────────────────

export type PostgresTransactionConfig = Parameters<typeof db.transaction>[1];

export type RunWithDbOptions = {
	/** Extra attempts after a transient failure. Total tries = maxRetries + 1. */
	maxRetries?: number;
	/** Optional PostgreSQL transaction access mode / isolation level. */
	txConfig?: PostgresTransactionConfig;
};

// PostgreSQL transient / serialization / connection contention SQLSTATE codes:
//   40001 — serialization_failure
//   40P01 — deadlock_detected
//   55P03 — lock_not_available
//   53300 — too_many_connections
//   08006 / 08001 / 08004 — connection failure / inability to connect / rejected
const RETRYABLE_PG_CODES = new Set<string>([
	"40001",
	"40P01",
	"55P03",
	"53300",
	"08006",
	"08001",
	"08004"
]);

function extractPgCode(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null) return undefined;
	const err = error as { code?: unknown; cause?: unknown };
	if (typeof err.code === "string") return err.code;
	if (typeof err.cause === "object" && err.cause !== null) {
		const causeCode = (err.cause as { code?: unknown }).code;
		if (typeof causeCode === "string") return causeCode;
	}
	return undefined;
}

function isRetryableTxError(error: unknown): boolean {
	const code = extractPgCode(error);
	if (code && RETRYABLE_PG_CODES.has(code)) return true;

	const message =
		typeof error === "object" && error !== null && "message" in error
			? String((error as { message?: unknown }).message ?? "")
			: "";

	return /(deadlock detected|could not serialize access|lock timeout|connection terminated unexpectedly|too many clients)/i.test(
		message
	);
}

const MAX_BACKOFF_MS = 2_000;

/**
 * Run an async `fn` inside a PostgreSQL transaction, retrying on transient
 * serialization, deadlock, lock, or connection errors.
 */
export async function withTransaction<T>(
	fn: (tx: Transaction) => Promise<T>,
	options: RunWithDbOptions = {}
): Promise<T> {
	const { maxRetries = 2, txConfig } = options;

	let attempt = 0;
	for (;;) {
		try {
			return await db.transaction(fn, txConfig);
		} catch (error: unknown) {
			if (attempt >= maxRetries || !isRetryableTxError(error)) throw error;
			attempt += 1;
			const backoff = Math.min(50 * 2 ** (attempt - 1), MAX_BACKOFF_MS);
			await new Promise(resolve =>
				setTimeout(resolve, backoff + Math.random() * 50)
			);
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports
// ─────────────────────────────────────────────────────────────────────────────

export type { SQL, SQLWrapper } from "drizzle-orm";
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
	sql
} from "drizzle-orm";
export * from "./schema";
