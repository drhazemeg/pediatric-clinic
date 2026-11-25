import { type AnyColumn, eq, type SQL } from "drizzle-orm";
import { throwForbidden, throwNotFound } from "./errors";

export interface OwnedRow {
	creatorUserId: string | null | undefined;
}

type CreatorColumnKey<TTable> = {
	[K in keyof TTable]: TTable[K] extends AnyColumn ? K : never;
}[keyof TTable];

export function assertOwnership(
	row: OwnedRow | null | undefined,
	userId: string,
	resource = "Resource"
): asserts row is OwnedRow & { creatorUserId: string } {
	if (!row) {
		throwNotFound(resource);
	}
	if (!userId || !row.creatorUserId || row.creatorUserId !== userId) {
		throwForbidden();
	}
}

export function ownershipFilter<
	TTable extends Record<string, unknown>,
	TKey extends CreatorColumnKey<TTable> & string
>(table: TTable, userId: string, creatorColumn: TKey): SQL {
	const column = table[creatorColumn];
	if (!column) {
		throw new Error(`Invalid ownership column "${String(creatorColumn)}"`);
	}
	return eq(column as unknown as AnyColumn, userId);
}
