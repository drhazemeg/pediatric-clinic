// src/server/functions/finances.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, clinicLedgerEntries, db, eq } from "@/db";
import { queryCache } from "@/db/cache";
import {
	createLedgerEntry,
	deleteLedgerEntry,
	getLedgerCategoryBreakdown,
	getLedgerChartData,
	getLedgerSummary,
	listLedgerEntries
} from "@/db/queries/finances";
import { toAppServerError } from "../fn-errors";
import { financeAccessMiddleware } from "../fn-middleware";

const ledgerRangeSchema = z.object({
	clinicId: z.string().min(1),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional()
});

const createLedgerEntrySchema = z.object({
	clinicId: z.string().min(1),
	kind: z.enum(["expense", "revenue"]),
	category: z.string().trim().min(1).max(120),
	amountCents: z.number().int().positive(),
	note: z.string().trim().max(1000).nullable().optional(),
	occurredAt: z.coerce.date()
});

const updateLedgerEntrySchema = z.object({
	id: z.number().int().positive(),
	clinicId: z.string().min(1),
	patch: z.object({
		kind: z.enum(["expense", "revenue"]).optional(),
		category: z.string().trim().min(1).max(120).optional(),
		amountCents: z.number().int().positive().optional(),
		note: z.string().trim().max(1000).nullable().optional(),
		occurredAt: z.coerce.date().optional()
	})
});

async function updateLedgerEntryRecord(
	id: number,
	clinicId: string,
	patch: z.infer<typeof updateLedgerEntrySchema>["patch"]
) {
	const [row] = await db
		.update(clinicLedgerEntries)
		.set({
			...patch,
			updatedAt: new Date()
		})
		.where(
			and(
				eq(clinicLedgerEntries.id, id),
				eq(clinicLedgerEntries.clinicId, clinicId)
			)
		)
		.returning();
	return row;
}

function invalidateFinanceCache(clinicId: string) {
	queryCache.invalidateTag(`finances:clinic:${clinicId}`);
	queryCache.invalidatePrefix(`finances:${clinicId}:`);
}

export const listLedgerEntriesFn = createServerFn({ method: "GET" })
	.middleware([financeAccessMiddleware])
	.validator(
		ledgerRangeSchema.extend({
			kind: z.enum(["revenue", "expense", "all"]).default("all"),
			category: z.string().optional(),
			search: z.string().optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await listLedgerEntries(data as never);
		} catch (err) {
			toAppServerError(err, "Failed to load ledger entries");
		}
	});

export const getLedgerSummaryFn = createServerFn({ method: "GET" })
	.middleware([financeAccessMiddleware])
	.validator(ledgerRangeSchema)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await getLedgerSummary(data as never);
		} catch (err) {
			toAppServerError(err, "Failed to load ledger summary");
		}
	});

export const getLedgerChartDataFn = createServerFn({ method: "GET" })
	.middleware([financeAccessMiddleware])
	.validator(ledgerRangeSchema)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await getLedgerChartData(data as never);
		} catch (err) {
			toAppServerError(err, "Failed to load ledger chart data");
		}
	});

export const getLedgerCategoryBreakdownFn = createServerFn({ method: "GET" })
	.middleware([financeAccessMiddleware])
	.validator(
		ledgerRangeSchema.extend({
			kind: z.enum(["revenue", "expense"])
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await getLedgerCategoryBreakdown(data as never);
		} catch (err) {
			toAppServerError(err, "Failed to load category breakdown");
		}
	});

export const createLedgerEntryFn = createServerFn({ method: "POST" })
	.middleware([financeAccessMiddleware])
	.validator(createLedgerEntrySchema)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			const created = await createLedgerEntry(data as never);
			invalidateFinanceCache(data.clinicId);
			return created;
		} catch (err) {
			toAppServerError(err, "Failed to create ledger entry");
		}
	});

export const updateLedgerEntryFn = createServerFn({ method: "POST" })
	.middleware([financeAccessMiddleware])
	.validator(updateLedgerEntrySchema)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			const updated = await updateLedgerEntryRecord(
				data.id,
				data.clinicId,
				data.patch
			);
			if (!updated) {
				throw new Error("Ledger entry not found");
			}
			invalidateFinanceCache(data.clinicId);
			return updated;
		} catch (err) {
			toAppServerError(err, "Failed to update ledger entry");
		}
	});

export const deleteLedgerEntryFn = createServerFn({ method: "POST" })
	.middleware([financeAccessMiddleware])
	.validator(
		z.object({
			id: z.number().int().positive(),
			clinicId: z.string().min(1)
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			await deleteLedgerEntry(data.id, data.clinicId);
			invalidateFinanceCache(data.clinicId);
			return { deleted: true as const, id: data.id };
		} catch (err) {
			toAppServerError(err, "Failed to delete ledger entry");
		}
	});

export const getFinanceInsightFn = createServerFn({ method: "GET" })
	.middleware([financeAccessMiddleware])
	.validator(ledgerRangeSchema)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			const [summary, revenueCategories, expenseCategories] = await Promise.all(
				[
					getLedgerSummary(data),
					getLedgerCategoryBreakdown({ ...data, kind: "revenue" }),
					getLedgerCategoryBreakdown({ ...data, kind: "expense" })
				]
			);
			const margin = summary.profitMarginPercent;
			const healthScore = Math.max(0, Math.min(100, 50 + margin));
			const status =
				summary.totalCount === 0 || healthScore < 60
					? "attention"
					: healthScore < 80
						? "watch"
						: "healthy";
			const topRevenueSource =
				revenueCategories[0]?.category ?? "No revenue recorded";
			const topExpenseSource =
				expenseCategories[0]?.category ?? "No expenses recorded";
			const summaryEn =
				summary.totalCount === 0
					? "No financial transactions were recorded in this period."
					: summary.netBalanceCents >= 0
						? `Revenue exceeds expenses by ${summary.profitMarginPercent}% of revenue in this period.`
						: "Expenses exceed revenue in this period; review the largest cost categories.";
			const summaryAr =
				summary.totalCount === 0
					? "لم يتم تسجيل معاملات مالية خلال هذه الفترة."
					: summary.netBalanceCents >= 0
						? `تتجاوز الإيرادات المصروفات بهامش ${summary.profitMarginPercent}% خلال هذه الفترة.`
						: "تتجاوز المصروفات الإيرادات خلال هذه الفترة؛ يُرجى مراجعة أكبر بنود التكلفة.";
			const recommendations =
				summary.totalCount === 0
					? [
							{
								en: "Record transactions to enable a meaningful financial review.",
								ar: "سجّل المعاملات لتمكين مراجعة مالية مفيدة."
							}
						]
					: summary.netBalanceCents < 0
						? [
								{
									en: `Review spending in ${topExpenseSource}.`,
									ar: `راجع الإنفاق في بند ${topExpenseSource}.`
								}
							]
						: [];
			return {
				status,
				healthScore,
				summaryEn,
				summaryAr,
				topRevenueSource,
				topExpenseSource,
				recommendations
			};
		} catch (err) {
			toAppServerError(err, "Failed to generate financial summary");
		}
	});
