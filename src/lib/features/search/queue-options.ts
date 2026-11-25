import type { QueryClient } from '@tanstack/react-query';

import { mutationOptions, queryOptions } from '@tanstack/react-query';

import {
  enqueueClinicPatientFn,
  listClinicQueueFn,
  updateQueueEntryStatusFn,
} from '@/server/functions/queue.functions';

export type EnqueueClinicPatientInput = Parameters<
  typeof enqueueClinicPatientFn
>[0]['data'];

export type UpdateQueueEntryStatusInput = Parameters<
  typeof updateQueueEntryStatusFn
>[0]['data'];

export const queueQueryKeys = {
  all: ['queue'] as const,
  clinic: (clinicId: string) =>
    [...queueQueryKeys.all, 'clinic', clinicId] as const,
  daily: (clinicId: string, dateIso?: string) =>
    [...queueQueryKeys.clinic(clinicId), 'daily', dateIso ?? 'today'] as const,
};

export const queueQueryOptions = {
  daily: (clinicId: string, dateIso?: string) =>
    queryOptions({
      queryKey: queueQueryKeys.daily(clinicId, dateIso),
      queryFn: async () =>
        await listClinicQueueFn({ data: { clinicId, dateIso } }),
      staleTime: 10_000,
      gcTime: 5 * 60_000,
    }),
};

export function enqueueClinicPatientMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['queue', 'enqueue'] as const,
    mutationFn: async (input: EnqueueClinicPatientInput) =>
      await enqueueClinicPatientFn({ data: input }),
    onSuccess: async (_created, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queueQueryKeys.clinic(variables.clinicId),
      });
    },
  });
}

export function updateQueueEntryStatusMutationOptions(
  queryClient: QueryClient,
) {
  return mutationOptions({
    mutationKey: ['queue', 'status', 'update'] as const,
    mutationFn: async (input: UpdateQueueEntryStatusInput) =>
      await updateQueueEntryStatusFn({ data: input }),
    onSuccess: async (updated) => {
      const targetKey =
        updated.clinicId === ''
          ? queueQueryKeys.all
          : queueQueryKeys.clinic(updated.clinicId);

      await queryClient.invalidateQueries({ queryKey: targetKey });
    },
  });
}
