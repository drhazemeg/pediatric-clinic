import {
	and,
	asc,
	type ClinicLedgerEntry,
	type CreateLedgerEntryInput,
	clinicLedgerEntries,
	db,
	desc,
	eq,
	gte,
	ilike,
	type LedgerFilterInput,
	lte,
	or,
	sql
} from "..";

export interface ExtendedLedgerFilterInput extends LedgerFilterInput {
	kind?: "revenue" | "expense" | "all";
	category?: string;
	search?: string;
}

export async function listLedgerEntries(
	data: ExtendedLedgerFilterInput
): Promise<ClinicLedgerEntry[]> {
	const conditions = [eq(clinicLedgerEntries.clinicId, data.clinicId)];
	if (data.from)
		conditions.push(gte(clinicLedgerEntries.occurredAt, data.from));
	if (data.to) conditions.push(lte(clinicLedgerEntries.occurredAt, data.to));
	if (data.kind && data.kind !== "all")
		conditions.push(eq(clinicLedgerEntries.kind, data.kind));
	if (data.category && data.category !== "all")
		conditions.push(eq(clinicLedgerEntries.category, data.category));
	if (data.search?.trim()) {
		const term = `%${data.search.trim()}%`;
		const searchCond = or(
			ilike(clinicLedgerEntries.category, term),
			ilike(clinicLedgerEntries.note, term)
		);
		if (searchCond) {
			conditions.push(searchCond);
		}
	}

	return db
		.select()
		.from(clinicLedgerEntries)
		.where(and(...conditions))
		.orderBy(desc(clinicLedgerEntries.occurredAt));
}

export async function getLedgerSummary(data: LedgerFilterInput) {
	const entries = await listLedgerEntries({ ...data, kind: "all" });
	let totalRevenueCents = 0;
	let totalExpenseCents = 0;
	let revenueCount = 0;
	let expenseCount = 0;

	for (const e of entries) {
		if (e.kind === "revenue") {
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
		profitMarginPercent
	};
}

export interface DailyLedgerPoint {
	date: string; // "YYYY-MM-DD"
	revenue: number; // cents
	expense: number; // cents
	net: number; // cents
}

/**
 * Aggregate ledger entries by calendar day for chart rendering.
 * Returns one row per day that has at least one entry within the range.
 */
export async function getLedgerChartData(
	data: LedgerFilterInput
): Promise<DailyLedgerPoint[]> {
	const conditions = [eq(clinicLedgerEntries.clinicId, data.clinicId)];
	if (data.from)
		conditions.push(gte(clinicLedgerEntries.occurredAt, data.from));
	if (data.to) conditions.push(lte(clinicLedgerEntries.occurredAt, data.to));

	const rows = await db
		.select({
			date: sql<string>`to_char(${clinicLedgerEntries.occurredAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
			kind: clinicLedgerEntries.kind,
			total: sql<number>`sum(${clinicLedgerEntries.amountCents})::int`
		})
		.from(clinicLedgerEntries)
		.where(and(...conditions))
		.groupBy(
			sql`to_char(${clinicLedgerEntries.occurredAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
			clinicLedgerEntries.kind
		)
		.orderBy(
			asc(
				sql`to_char(${clinicLedgerEntries.occurredAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`
			)
		);

	// Pivot into one object per date
	const byDate = new Map<string, DailyLedgerPoint>();
	for (const row of rows) {
		const existing = byDate.get(row.date) ?? {
			date: row.date,
			revenue: 0,
			expense: 0,
			net: 0
		};
		if (row.kind === "revenue") existing.revenue += row.total ?? 0;
		else existing.expense += row.total ?? 0;
		existing.net = existing.revenue - existing.expense;
		byDate.set(row.date, existing);
	}
	return Array.from(byDate.values());
}

export interface CategoryBreakdown {
	category: string;
	amountCents: number;
	count: number;
}

export async function getLedgerCategoryBreakdown(
	data: LedgerFilterInput & { kind: "revenue" | "expense" }
): Promise<CategoryBreakdown[]> {
	const conditions = [
		eq(clinicLedgerEntries.clinicId, data.clinicId),
		eq(clinicLedgerEntries.kind, data.kind)
	];
	if (data.from)
		conditions.push(gte(clinicLedgerEntries.occurredAt, data.from));
	if (data.to) conditions.push(lte(clinicLedgerEntries.occurredAt, data.to));

	return db
		.select({
			category: clinicLedgerEntries.category,
			amountCents: sql<number>`sum(${clinicLedgerEntries.amountCents})::int`,
			count: sql<number>`count(*)::int`
		})
		.from(clinicLedgerEntries)
		.where(and(...conditions))
		.groupBy(clinicLedgerEntries.category)
		.orderBy(desc(sql`sum(${clinicLedgerEntries.amountCents})`)) as Promise<
		CategoryBreakdown[]
	>;
}

export async function createLedgerEntry(
	data: CreateLedgerEntryInput
): Promise<ClinicLedgerEntry> {
	const [entry] = await db.insert(clinicLedgerEntries).values(data).returning();
	if (!entry) {
		throw new Error("Failed to create ledger entry");
	}
	return entry;
}

export async function deleteLedgerEntry(
	id: number,
	clinicId: string
): Promise<void> {
	await db
		.delete(clinicLedgerEntries)
		.where(
			and(
				eq(clinicLedgerEntries.id, id),
				eq(clinicLedgerEntries.clinicId, clinicId)
			)
		);
}
