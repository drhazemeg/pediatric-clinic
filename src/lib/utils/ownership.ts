import type { AnyColumn, SQL } from 'drizzle-orm';

import { eq } from 'drizzle-orm';

import { throwForbidden, throwNotFound } from './errors';

export interface OwnedRow {
  creatorUserId: string | null | undefined;
}

type CreatorColumnKey<TTable> = {
  [K in keyof TTable]: TTable[K] extends AnyColumn ? K : never;
}[keyof TTable];

type AssertOwnershipFn = (
  row: OwnedRow | null | undefined,
  userId: string,
  resource?: string,
) => asserts row is OwnedRow & { creatorUserId: string };

const isAnyColumn = (value: unknown): value is AnyColumn =>
  typeof value === 'object' &&
  value !== null &&
  'name' in value &&
  'dataType' in value;

export const assertOwnership: AssertOwnershipFn = (
  row,
  userId,
  resource = 'Resource',
) => {
  if (!row) {
    throwNotFound(resource);
  }

  if (
    userId === '' ||
    row.creatorUserId === undefined ||
    row.creatorUserId === null ||
    row.creatorUserId === '' ||
    row.creatorUserId !== userId
  ) {
    throwForbidden();
  }
};

export const ownershipFilter = <TTable extends Record<string, unknown>>(
  table: TTable,
  userId: string,
  creatorColumn: CreatorColumnKey<TTable> & string,
): SQL => {
  const column: unknown = table[creatorColumn];

  if (!isAnyColumn(column)) {
    throw new Error(`Invalid ownership column "${creatorColumn}"`);
  }

  return eq(column, userId);
};
