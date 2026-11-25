import { mutationOptions, queryOptions } from '@tanstack/react-query';

import {
  callNextClinicPatientFn,
  enqueueClinicPatientFn,
  listClinicQueueFn,
  updateQueueEntryStatusFn,
} from '@/server/functions/queue.functions';

export const queueQueryKeys = {
  all: ['queue'] as const,
  today: (clinicId: string) =>
    [...queueQueryKeys.all, 'today', clinicId] as const,
};

export const queueQueryOptions = {
  today: (clinicId: string, enabled = true, refetchInterval?: number) =>
    queryOptions({
      queryKey: queueQueryKeys.today(clinicId),
      queryFn: async () => await listClinicQueueFn({ data: { clinicId } }),
      enabled: enabled && clinicId.length > 0,
      refetchInterval,
    }),
};

export const queueMutationOptions = {
  enqueue: () =>
    mutationOptions({
      mutationKey: ['queue', 'enqueue'] as const,
      mutationFn: async (
        input: Parameters<typeof enqueueClinicPatientFn>[0]['data'],
      ) => await enqueueClinicPatientFn({ data: input }),
    }),
  updateStatus: () =>
    mutationOptions({
      mutationKey: ['queue', 'status'] as const,
      mutationFn: async (
        input: Parameters<typeof updateQueueEntryStatusFn>[0]['data'],
      ) => await updateQueueEntryStatusFn({ data: input }),
    }),
  callNext: () =>
    mutationOptions({
      mutationKey: ['queue', 'call-next'] as const,
      mutationFn: async (
        input: Parameters<typeof callNextClinicPatientFn>[0]['data'],
      ) => await callNextClinicPatientFn({ data: input }),
    }),
};
