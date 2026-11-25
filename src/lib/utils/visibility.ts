import type { AnyColumn, SQL } from 'drizzle-orm';

import { eq, or } from 'drizzle-orm';

interface VisibilityTable {
  isPublic: AnyColumn;
  creatorUserId: AnyColumn;
}

export const buildVisibilityCondition = (
  table: VisibilityTable,
  userId?: string,
): SQL | undefined => {
  if (userId === undefined || userId === '') {
    return eq(table.isPublic, true);
  }

  return or(eq(table.isPublic, true), eq(table.creatorUserId, userId));
};
