// apps/web/src/hooks/use-queue.ts

import type {
  QueueEntry,
  QueueStatus,
} from '#/integrations/tanstack-store/clinical-store.ts';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { clinicalActions } from '#/integrations/tanstack-store/clinical-store.ts';
import {
  queueMutationOptions,
  queueQueryKeys,
  queueQueryOptions,
} from '@/lib/features/queue/query-options';
import { getErrorMessage } from '@/lib/web/error-utils';

export function useQueueToday(clinicId: string | null) {
  return useQuery(
    queueQueryOptions.today(
      clinicId ?? '',
      clinicId !== null && clinicId !== '',
      3000,
    ),
  );
}

export function useEnqueuePatient() {
  const qc = useQueryClient();

  return useMutation({
    ...queueMutationOptions.enqueue(),
    onSuccess: (_, vars) => {
      toast.success('Added to queue');
      void qc.invalidateQueries({
        queryKey: queueQueryKeys.today(vars.clinicId),
      });
    },
    onError: (err) =>
      toast.error('Enqueue failed', { description: getErrorMessage(err) }),
  });
}

export function useUpdateQueueStatus() {
  const qc = useQueryClient();

  return useMutation({
    ...queueMutationOptions.updateStatus(),
    onSuccess: (data) => {
      void qc.invalidateQueries({
        queryKey: queueQueryKeys.today(data.clinicId),
      });
    },
    onError: (err) =>
      toast.error('Queue update failed', {
        description: getErrorMessage(err),
      }),
  });
}

export function useCallNext() {
  const qc = useQueryClient();

  return useMutation({
    ...queueMutationOptions.callNext(),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: queueQueryKeys.today(vars.clinicId),
      });
    },
    onError: (err) =>
      toast.error('Call next failed', { description: getErrorMessage(err) }),
  });
}

const QUEUE_STATUS_MAP = new Map<string, QueueStatus>([
  ['in_vitals', 'in_vitals'],
  ['with_doctor', 'with_doctor'],
  ['done', 'done'],
  ['completed', 'done'],
  ['cancelled', 'done'],
]);

const toQueueStatus = (raw: string): QueueStatus =>
  QUEUE_STATUS_MAP.get(raw.toLowerCase()) ?? 'waiting';

/** Keeps clinicStore.queue in sync with the queue query. */
export function useSyncQueueToStore(clinicId: string) {
  const query = useQuery(queueQueryOptions.today(clinicId, clinicId !== ''));

  useEffect(() => {
    if (query.data === undefined) {
      return;
    }

    const mapped: Array<QueueEntry> = query.data.map((row) => {
      const { priority: rawPriority } = row;
      let priority: 0 | 1 | 2 = 0;

      if (rawPriority === 1 || rawPriority === 2) {
        priority = rawPriority;
      }

      return {
        id: row.id,
        patientId: row.patientId,
        patientName: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
        mrn: row.patient.mrn,
        priority,
        status: toQueueStatus(row.status),
        enqueuedAt: new Date(row.createdAt).getTime(),
      };
    });

    clinicalActions.setQueue(mapped);
  }, [query.data]);

  return query;
}
