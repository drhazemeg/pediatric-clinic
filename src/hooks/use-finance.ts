// apps/web/src/hooks/use-finance.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
	createLedgerEntryMutationOptions,
	deleteLedgerEntryMutationOptions,
	financeQueryKeys,
	financeQueryOptions
} from "@/lib/features/finances/query-options";
import { getErrorMessage } from "@/lib/web/error-utils";

export interface LedgerDateRange {
	from?: Date;
	to?: Date;
}

export type LedgerKindFilter = "all" | "revenue" | "expense";
export type DatePreset = "7d" | "30d" | "90d" | "ytd" | "all";

export interface ClinicLedgerEntry {
	id: number;
	clinicId: string;
	kind: "revenue" | "expense";
	category: string;
	amountCents: number;
	note?: string | null;
	occurredAt: Date | string;
	createdAt?: Date | string;
	updatedAt?: Date | string;
}

export interface CreateLedgerEntryPayload {
	clinicId: string;
	kind: "expense" | "revenue";
	category: string;
	amountCents: number;
	note?: string;
	occurredAt?: Date;
}

export function getDateRangeFromPreset(preset: DatePreset): LedgerDateRange {
	const now = new Date();
	if (preset === "all") return {};

	const from = new Date();
	if (preset === "7d") {
		from.setDate(now.getDate() - 7);
	} else if (preset === "30d") {
		from.setDate(now.getDate() - 30);
	} else if (preset === "90d") {
		from.setDate(now.getDate() - 90);
	} else if (preset === "ytd") {
		from.setMonth(0, 1);
		from.setHours(0, 0, 0, 0);
	}
	return { from, to: now };
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual query hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useLedgerEntries(
	clinicId: string | null | undefined,
	range?: LedgerDateRange,
	kind: LedgerKindFilter = "all",
	category?: string,
	search?: string
) {
	return useQuery({
		...financeQueryOptions.entries({
			clinicId: clinicId ?? "",
			from: range?.from,
			to: range?.to,
			kind,
			category: category && category !== "all" ? category : undefined,
			search: search?.trim() ? search.trim() : undefined
		}),
		enabled: Boolean(clinicId)
	});
}

export function useLedgerSummary(
	clinicId: string | null | undefined,
	range?: LedgerDateRange
) {
	return useQuery({
		...financeQueryOptions.summary({
			clinicId: clinicId ?? "",
			from: range?.from,
			to: range?.to
		}),
		enabled: Boolean(clinicId)
	});
}

export function useLedgerChartData(
	clinicId: string | null | undefined,
	range?: LedgerDateRange
) {
	return useQuery({
		...financeQueryOptions.chart({
			clinicId: clinicId ?? "",
			from: range?.from,
			to: range?.to
		}),
		enabled: Boolean(clinicId)
	});
}

export function useLedgerCategoryBreakdown(
	clinicId: string | null | undefined,
	kind: "revenue" | "expense",
	range?: LedgerDateRange
) {
	return useQuery({
		...financeQueryOptions.categoryBreakdown({
			clinicId: clinicId ?? "",
			kind,
			from: range?.from,
			to: range?.to
		}),
		enabled: Boolean(clinicId)
	});
}

export function useFinanceAiInsight(
	clinicId: string | null | undefined,
	range?: LedgerDateRange
) {
	return useQuery({
		...financeQueryOptions.insight({
			clinicId: clinicId ?? "",
			from: range?.from,
			to: range?.to
		}),
		enabled: Boolean(clinicId)
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateLedgerEntry() {
	const queryClient = useQueryClient();

	return useMutation({
		...createLedgerEntryMutationOptions(queryClient),
		onSuccess: async (_data, variables) => {
			await queryClient.invalidateQueries({
				queryKey: financeQueryKeys.clinic(variables.clinicId)
			});
			toast.success(
				variables.kind === "revenue"
					? "Revenue recorded ✓"
					: "Expense recorded ✓"
			);
		},
		onError: err => {
			toast.error(getErrorMessage(err) || "Failed to save ledger entry");
		}
	});
}

export function useDeleteLedgerEntry(_clinicId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		...deleteLedgerEntryMutationOptions(queryClient),
		onSuccess: async (_data, variables) => {
			await queryClient.invalidateQueries({
				queryKey: financeQueryKeys.clinic(variables.clinicId)
			});
			toast.success("Entry deleted");
		},
		onError: err => {
			toast.error(getErrorMessage(err) || "Failed to delete entry");
		}
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite hook
// ─────────────────────────────────────────────────────────────────────────────

export function useClinicFinance(
	clinicId: string | null | undefined,
	range?: LedgerDateRange
) {
	const entriesQuery = useLedgerEntries(clinicId, range);
	const summaryQuery = useLedgerSummary(clinicId, range);
	const chartQuery = useLedgerChartData(clinicId, range);
	const revBreakdownQuery = useLedgerCategoryBreakdown(
		clinicId,
		"revenue",
		range
	);
	const expBreakdownQuery = useLedgerCategoryBreakdown(
		clinicId,
		"expense",
		range
	);
	const aiInsightQuery = useFinanceAiInsight(clinicId, range);
	const createEntryMutation = useCreateLedgerEntry();

	const createEntry = useCallback(
		async (
			input: Omit<CreateLedgerEntryPayload, "clinicId"> & { clinicId?: string }
		) => {
			const target = input.clinicId ?? clinicId;
			if (!target) throw new Error("No active clinic selected");
			return createEntryMutation.mutateAsync({
				...input,
				clinicId: target,
				occurredAt: input.occurredAt ?? new Date()
			});
		},
		[clinicId, createEntryMutation]
	);

	return useMemo(
		() => ({
			entries: entriesQuery.data ?? [],
			summary: summaryQuery.data ?? null,
			chartPoints: chartQuery.data ?? [],
			revBreakdown: revBreakdownQuery.data ?? [],
			expBreakdown: expBreakdownQuery.data ?? [],
			aiInsight: aiInsightQuery.data ?? null,
			entriesQuery,
			summaryQuery,
			chartQuery,
			aiInsightQuery,
			createEntry,
			createEntryMutation,
			isCreating: createEntryMutation.isPending,
			isLoading:
				entriesQuery.isLoading ||
				summaryQuery.isLoading ||
				chartQuery.isLoading,
			isFetching:
				entriesQuery.isFetching ||
				summaryQuery.isFetching ||
				chartQuery.isFetching,
			error: entriesQuery.error ?? summaryQuery.error ?? null
		}),
		[
			entriesQuery,
			summaryQuery,
			chartQuery,
			revBreakdownQuery,
			expBreakdownQuery,
			aiInsightQuery,
			createEntry,
			createEntryMutation
		]
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting utilities
// ─────────────────────────────────────────────────────────────────────────────

export function formatLedgerAmount(
	amountCents: number,
	currency = "EGP",
	locale = "en-EG"
): string {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amountCents / 100);
}

export function formatEgp(cents: number | null | undefined): string {
	return formatLedgerAmount(cents ?? 0);
}
