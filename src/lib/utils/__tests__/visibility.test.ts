import { describe, expect, it } from 'bun:test';

import { SQL } from 'drizzle-orm';
import { boolean, pgTable, text } from 'drizzle-orm/pg-core';

import { buildVisibilityCondition } from '../visibility';

const mockTable = pgTable('mock_visibility', {
  isPublic: boolean('isPublic').notNull(),
  creatorUserId: text('creatorUserId').notNull(),
});

describe('buildVisibilityCondition', () => {
  it('returns SQL condition when no userId (public only)', () => {
    const result = buildVisibilityCondition(mockTable);
    expect(result).toBeInstanceOf(SQL);
  });

  it('returns SQL condition when userId provided (public or own)', () => {
    const result = buildVisibilityCondition(mockTable, 'user-123');
    expect(result).toBeInstanceOf(SQL);
  });
});
