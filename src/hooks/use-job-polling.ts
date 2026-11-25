// apps/web/src/hooks/use-job-polling.ts

import type {
  ActiveJob,
  JobTransport,
  JobTransportEvent,
} from './use-job-shared';

import { useQueries } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import { clinicalActions } from '#/integrations/tanstack-store/clinical-store.ts';
import { jobQueryOptions } from '@/lib/features/jobs/query-options';

import { isTerminal, jobJsonRecordSchema } from './use-job-shared';

const jobKindSchema = z.enum([
  'growth_recalc',
  'immunization_sweep',
  'ledger_report',
  'certificate_pdf',
  'ai_soap_draft',
  'ai_patient_education',
  'ai_differential_dx',
  'ai_dosing_safety',
  'ai_growth_interpretation',
  'ai_immunization_advice',
  'ai_follow_up_questions',
]);

const polledJobSchema = z.object({
  id: z.string(),
  kind: jobKindSchema,
  status: z.string(),
  progress: z.number(),
  progressMessage: z.string().nullable().optional(),
  logs: z.array(z.any()),
  resultJson: jobJsonRecordSchema.nullable().optional(),
  result: jobJsonRecordSchema.nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  tokensUsed: z.number().nullable().optional(),
  durationMs: z.number().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

type PolledJob = z.infer<typeof polledJobSchema>;

const queryStateSchema = z.object({
  state: z.object({
    data: z.object({ status: z.string() }).nullable().optional(),
  }),
});

const jobStatusRefetchInterval = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- React Query refetchInterval callback signature
  query: unknown,
): number | false => {
  const parsed = queryStateSchema.safeParse(query);
  const data = parsed.success ? parsed.data.state.data : null;

  if (data === null || data === undefined) {
    return 1000;
  }

  if (isTerminal(data.status)) {
    return false;
  }

  return 1000;
};

const serializeSnapshot = (jobs: Array<ActiveJob>): string =>
  jobs
    .map((j) => {
      const logsLen = Array.isArray(j.logs) ? j.logs.length : 0;

      return [j.id, j.status, j.progress, j.progressMessage, logsLen].join(':');
    })
    .toSorted()
    .join('|');

const toActiveJob = (d: PolledJob): ActiveJob => ({
  id: d.id,
  kind: d.kind,
  status: d.status,
  progress: d.progress,
  progressMessage: d.progressMessage ?? '',
  logs: d.logs,
  resultJson: d.resultJson,
  errorMessage: d.errorMessage ?? undefined,
  tokensUsed: d.tokensUsed ?? undefined,
  durationMs: d.durationMs ?? undefined,
  createdAt: String(d.createdAt),
  updatedAt: String(d.updatedAt),
});

const collectActiveJobs = (
  queries: ReadonlyArray<{ data?: unknown }>,
): Array<ActiveJob> => {
  const nextActive: Array<ActiveJob> = [];

  for (const q of queries) {
    const parsed = polledJobSchema.safeParse(q.data);

    if (parsed.success && !isTerminal(parsed.data.status)) {
      nextActive.push(toActiveJob(parsed.data));
    }
  }

  return nextActive;
};

export function useJobPolling({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}): JobTransport {
  const [jobIds, setJobIds] = useState<Array<string>>([]);
  const [activeJobs, setActiveJobs] = useState<Array<ActiveJob>>([]);

  const onUpdateRef = useRef<((event: JobTransportEvent) => void) | undefined>(
    undefined,
  );

  const onErrorRef = useRef<(error: Error) => void>(undefined);

  const prevSnapshotRef = useRef('');
  const prevStatusesRef = useRef<Record<string, string>>({});

  const jobQueries = useQueries({
    queries: jobIds.map((jobId) => ({
      ...jobQueryOptions.get(jobId, Boolean(jobId) && isAuthenticated),
      enabled: Boolean(jobId) && isAuthenticated,
      refetchInterval: jobStatusRefetchInterval,
    })),
  });

  useEffect(() => {
    if (jobIds.length === 0) {
      return;
    }

    const nextActive = collectActiveJobs(jobQueries);
    const nextIds = serializeSnapshot(nextActive);

    if (prevSnapshotRef.current !== nextIds) {
      prevSnapshotRef.current = nextIds;
      setActiveJobs(nextActive);
    }

    for (let i = 0; i < jobQueries.length; i += 1) {
      const query = jobQueries.at(i);
      const jobId = jobIds.at(i);

      if (jobId === undefined || jobId === '' || query?.data === undefined) {
        continue;
      }

      const parsed = polledJobSchema.safeParse(query.data);

      if (!parsed.success) {
        continue;
      }

      const { data } = parsed;
      const { status } = data;

      if (prevStatusesRef.current[jobId] === status) {
        continue;
      }

      prevStatusesRef.current[jobId] = status;

      if (isTerminal(status)) {
        clinicalActions.recordAiResult(jobId, {
          status: status === 'failed' ? 'failed' : 'completed',
          result: data.resultJson ?? data.result ?? undefined,
          errorMessage: data.errorMessage ?? undefined,
        });
      }

      onUpdateRef.current?.({
        jobId,
        status,
        data: {
          kind: data.kind,
          resultJson: data.resultJson ?? null,
          errorMessage: data.errorMessage ?? null,
        },
      });
    }
  }, [jobIds, jobQueries]);

  const subscribe = useCallback((ids: Array<string>) => {
    setJobIds((prev) =>
      prev.length === ids.length && prev.every((id, i) => id === ids[i])
        ? prev
        : ids,
    );
  }, []);

  const unsubscribe = useCallback(() => {
    prevSnapshotRef.current = '';
    prevStatusesRef.current = {};
    setJobIds([]);
    setActiveJobs([]);
  }, []);

  const onUpdate = useCallback(
    (listener: (event: JobTransportEvent) => void) => {
      onUpdateRef.current = listener;
    },
    [],
  );

  const onError = useCallback((listener: (error: Error) => void) => {
    onErrorRef.current = listener;
  }, []);

  return useMemo(
    () => ({
      subscribe,
      unsubscribe,
      onUpdate,
      onError,
      activeJobs,
    }),
    [subscribe, unsubscribe, onUpdate, onError, activeJobs],
  );
}
