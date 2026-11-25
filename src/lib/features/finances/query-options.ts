import type { QueryClient } from '@tanstack/react-query';

// src/features/finances/queries-and-mutations.options.ts
import { mutationOptions, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import {
  createLedgerEntryFn,
  deleteLedgerEntryFn,
  getFinanceInsightFn,
  getLedgerCategoryBreakdownFn,
  getLedgerChartDataFn,
  getLedgerSummaryFn,
  listLedgerEntriesFn,
  updateLedgerEntryFn,
} from '@/server/functions/finances.functions';

export const ledgerKindFilterSchema = z.enum(['revenue', 'expense', 'all']);

export type LedgerKindFilter = z.infer<typeof ledgerKindFilterSchema>;

export interface LedgerRangeParams {
  clinicId: string;
  from?: Date;
  to?: Date;
}

export interface LedgerEntriesParams extends LedgerRangeParams {
  kind?: LedgerKindFilter;
  category?: string;
  search?: string;
}

export interface CreateLedgerEntryParams {
  clinicId: string;
  kind: 'expense' | 'revenue';
  category: string;
  amountCents: number;
  note?: string | null;
  occurredAt: Date;
}

export interface UpdateLedgerEntryParams {
  id: number;
  clinicId: string;
  patch: {
    kind?: 'expense' | 'revenue';
    category?: string;
    amountCents?: number;
    note?: string | null;
    occurredAt?: Date;
  };
}

export interface DeleteLedgerEntryParams {
  id: number;
  clinicId: string;
}

const serializeRange = (params: LedgerRangeParams) => ({
  clinicId: params.clinicId,
  fromIso: params.from ? params.from.toISOString() : '',
  toIso: params.to ? params.to.toISOString() : '',
});

export const financeQueryKeys = {
  all: ['finances'] as const,
  clinic: (clinicId: string) => [...financeQueryKeys.all, clinicId] as const,
  entries: (params: LedgerEntriesParams) =>
    [
      ...financeQueryKeys.clinic(params.clinicId),
      'entries',
      {
        ...serializeRange(params),
        kind: params.kind ?? 'all',
        category: params.category ?? '',
        search: params.search?.trim() ?? '',
      },
    ] as const,
  summary: (params: LedgerRangeParams) =>
    [
      ...financeQueryKeys.clinic(params.clinicId),
      'summary',
      serializeRange(params),
    ] as const,
  chart: (params: LedgerRangeParams) =>
    [
      ...financeQueryKeys.clinic(params.clinicId),
      'chart',
      serializeRange(params),
    ] as const,
  categoryBreakdown: (
    params: LedgerRangeParams & { kind: 'revenue' | 'expense' },
  ) =>
    [
      ...financeQueryKeys.clinic(params.clinicId),
      'categories',
      params.kind,
      serializeRange(params),
    ] as const,
  insight: (params: LedgerRangeParams) =>
    [
      ...financeQueryKeys.clinic(params.clinicId),
      'insight',
      serializeRange(params),
    ] as const,
};

export const financeQueryOptions = {
  entries: (params: LedgerEntriesParams) =>
    queryOptions({
      queryKey: financeQueryKeys.entries(params),
      queryFn: async () => {
        const trimmedSearch = params.search?.trim() ?? '';

        return await listLedgerEntriesFn({
          data: {
            clinicId: params.clinicId,
            from: params.from,
            to: params.to,
            kind: params.kind ?? 'all',
            category: params.category,
            search: trimmedSearch.length > 0 ? trimmedSearch : undefined,
          },
        });
      },
      staleTime: 15_000,
      gcTime: 5 * 60_000,
    }),

  summary: (params: LedgerRangeParams) =>
    queryOptions({
      queryKey: financeQueryKeys.summary(params),
      queryFn: async () =>
        await getLedgerSummaryFn({
          data: {
            clinicId: params.clinicId,
            from: params.from,
            to: params.to,
          },
        }),
      staleTime: 15_000,
      gcTime: 5 * 60_000,
    }),

  chart: (params: LedgerRangeParams) =>
    queryOptions({
      queryKey: financeQueryKeys.chart(params),
      queryFn: async () =>
        await getLedgerChartDataFn({
          data: {
            clinicId: params.clinicId,
            from: params.from,
            to: params.to,
          },
        }),
      staleTime: 30_000,
      gcTime: 10 * 60_000,
    }),

  categoryBreakdown: (
    params: LedgerRangeParams & { kind: 'revenue' | 'expense' },
  ) =>
    queryOptions({
      queryKey: financeQueryKeys.categoryBreakdown(params),
      queryFn: async () =>
        await getLedgerCategoryBreakdownFn({
          data: {
            clinicId: params.clinicId,
            from: params.from,
            to: params.to,
            kind: params.kind,
          },
        }),
      staleTime: 30_000,
      gcTime: 10 * 60_000,
    }),

  insight: (params: LedgerRangeParams) =>
    queryOptions({
      queryKey: financeQueryKeys.insight(params),
      queryFn: async () =>
        await getFinanceInsightFn({
          data: {
            clinicId: params.clinicId,
            from: params.from,
            to: params.to,
          },
        }),
      staleTime: 60_000,
      gcTime: 10 * 60_000,
    }),
};

const invalidateClinicFinances = async (
  queryClient: QueryClient,
  clinicId: string,
) => {
  await queryClient.invalidateQueries({
    queryKey: financeQueryKeys.clinic(clinicId),
  });
};

export function createLedgerEntryMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['finances', 'entry', 'create'] as const,
    mutationFn: async (input: CreateLedgerEntryParams) =>
      await createLedgerEntryFn({ data: input }),
    onSuccess: async (_created, variables) => {
      await invalidateClinicFinances(queryClient, variables.clinicId);
    },
  });
}

export function updateLedgerEntryMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['finances', 'entry', 'update'] as const,
    mutationFn: async (input: UpdateLedgerEntryParams) =>
      await updateLedgerEntryFn({ data: input }),
    onSuccess: async (_updated, variables) => {
      await invalidateClinicFinances(queryClient, variables.clinicId);
    },
  });
}

export function deleteLedgerEntryMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['finances', 'entry', 'delete'] as const,
    mutationFn: async (input: DeleteLedgerEntryParams) =>
      await deleteLedgerEntryFn({ data: input }),
    onSuccess: async (_res, variables) => {
      await invalidateClinicFinances(queryClient, variables.clinicId);
    },
  });
}
