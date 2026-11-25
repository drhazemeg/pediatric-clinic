import type {
  ClinicLedgerEntry,
  CreateLedgerEntryInput,
  LedgerFilterInput,
} from '..';

import {
  and,
  asc,
  clinicLedgerEntries,
  db,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
} from '..';

export interface ExtendedLedgerFilterInput extends LedgerFilterInput {
  kind?: 'revenue' | 'expense' | 'all';
  category?: string;
  search?: string;
}

export async function listLedgerEntries(
  data: ExtendedLedgerFilterInput,
): Promise<Array<ClinicLedgerEntry>> {
  const conditions = [eq(clinicLedgerEntries.clinicId, data.clinicId)];

  if (data.from !== undefined) {
    conditions.push(gte(clinicLedgerEntries.occurredAt, data.from));
  }

  if (data.to !== undefined) {
    conditions.push(lte(clinicLedgerEntries.occurredAt, data.to));
  }

  if (data.kind !== undefined && data.kind !== 'all') {
    conditions.push(eq(clinicLedgerEntries.kind, data.kind));
  }

  if (
    data.category !== undefined &&
    data.category !== '' &&
    data.category !== 'all'
  ) {
    conditions.push(eq(clinicLedgerEntries.category, data.category));
  }

  if (data.search !== undefined && data.search.trim() !== '') {
    const term = `%${data.search.trim()}%`;

    const searchCond = or(
      ilike(clinicLedgerEntries.category, term),
      ilike(clinicLedgerEntries.note, term),
    );

    if (searchCond !== undefined) {
      conditions.push(searchCond);
    }
  }

  return await db
    .select()
    .from(clinicLedgerEntries)
    .where(and(...conditions))
    .orderBy(desc(clinicLedgerEntries.occurredAt));
}

export async function getLedgerSummary(data: LedgerFilterInput) {
  const entries = await listLedgerEntries({ ...data, kind: 'all' });
  let totalRevenueCents = 0;
  let totalExpenseCents = 0;
  let revenueCount = 0;
  let expenseCount = 0;

  for (const e of entries) {
    if (e.kind === 'revenue') {
      totalRevenueCents += e.amountCents;
      revenueCount += 1;
    } else {
      totalExpenseCents += e.amountCents;
      expenseCount += 1;
    }
  }

  const netBalanceCents = totalRevenueCents - totalExpenseCents;

  const profitMarginPercent =
    totalRevenueCents > 0
      ? Math.round((netBalanceCents / totalRevenueCents) * 100)
      : 0;

  return {
    totalRevenueCents,
    totalExpenseCents,
    netBalanceCents,
    revenueCount,
    expenseCount,
    totalCount: entries.length,
    profitMarginPercent,
  };
}

export interface DailyLedgerPoint {
  // "YYYY-MM-DD"
  date: string;
  // cents
  revenue: number;
  // cents
  expense: number;
  // cents
  net: number;
}

/**
 * Aggregate ledger entries by calendar day for chart rendering.
 * Returns one row per day that has at least one entry within the range.
 */
export async function getLedgerChartData(
  data: LedgerFilterInput,
): Promise<Array<DailyLedgerPoint>> {
  const conditions = [eq(clinicLedgerEntries.clinicId, data.clinicId)];

  if (data.from !== undefined) {
    conditions.push(gte(clinicLedgerEntries.occurredAt, data.from));
  }

  if (data.to !== undefined) {
    conditions.push(lte(clinicLedgerEntries.occurredAt, data.to));
  }

  const rows = await db
    .select({
      date: sql<string>`to_char(${clinicLedgerEntries.occurredAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
      kind: clinicLedgerEntries.kind,
      total: sql<number>`sum(${clinicLedgerEntries.amountCents})::int`,
    })
    .from(clinicLedgerEntries)
    .where(and(...conditions))
    .groupBy(
      sql`to_char(${clinicLedgerEntries.occurredAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
      clinicLedgerEntries.kind,
    )
    .orderBy(
      asc(
        sql`to_char(${clinicLedgerEntries.occurredAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
      ),
    );

  // Pivot into one object per date
  const byDate = new Map<string, DailyLedgerPoint>();

  for (const row of rows) {
    const existing = byDate.get(row.date) ?? {
      date: row.date,
      revenue: 0,
      expense: 0,
      net: 0,
    };

    if (row.kind === 'revenue') {
      existing.revenue += row.total;
    } else {
      existing.expense += row.total;
    }

    existing.net = existing.revenue - existing.expense;
    byDate.set(row.date, existing);
  }

  return [...byDate.values()];
}

export interface CategoryBreakdown {
  category: string;
  amountCents: number;
  count: number;
}

export async function getLedgerCategoryBreakdown(
  data: LedgerFilterInput & { kind: 'revenue' | 'expense' },
): Promise<Array<CategoryBreakdown>> {
  const conditions = [
    eq(clinicLedgerEntries.clinicId, data.clinicId),
    eq(clinicLedgerEntries.kind, data.kind),
  ];

  if (data.from !== undefined) {
    conditions.push(gte(clinicLedgerEntries.occurredAt, data.from));
  }

  if (data.to !== undefined) {
    conditions.push(lte(clinicLedgerEntries.occurredAt, data.to));
  }

  return await db
    .select({
      category: clinicLedgerEntries.category,
      amountCents: sql<number>`sum(${clinicLedgerEntries.amountCents})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(clinicLedgerEntries)
    .where(and(...conditions))
    .groupBy(clinicLedgerEntries.category)
    .orderBy(desc(sql`sum(${clinicLedgerEntries.amountCents})`));
}

export async function createLedgerEntry(
  data: CreateLedgerEntryInput,
): Promise<ClinicLedgerEntry> {
  const rows = await db.insert(clinicLedgerEntries).values(data).returning();
  const entry = rows.at(0);

  if (entry === undefined) {
    throw new Error('Failed to create ledger entry');
  }

  return entry;
}

export async function deleteLedgerEntry(
  id: number,
  clinicId: string,
): Promise<void> {
  await db
    .delete(clinicLedgerEntries)
    .where(
      and(
        eq(clinicLedgerEntries.id, id),
        eq(clinicLedgerEntries.clinicId, clinicId),
      ),
    );
}
