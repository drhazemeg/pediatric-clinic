import { sql } from 'drizzle-orm';
import { z } from 'zod';

export const paginationSchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

export interface PaginationInput {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  items: Array<T>;
  total: number;
}

export function paginateDefaults(input?: PaginationInput) {
  return {
    limit: input?.limit ?? 20,
    offset: input?.offset ?? 0,
  };
}

export function countSql() {
  return sql<number>`count(*)::int`;
}
