// apps/web/src/hooks/use-jobs.ts

import type {
  CompletedResult,
  JobKind,
  JobTransportEvent,
} from './use-job-shared';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { z } from 'zod';

import {
  jobActions,
  useJobsStore,
} from '@/integrations/tanstack-store/job-store';
import { authClient } from '@/lib/auth-client';
import { cancelJobFn, listJobsFn } from '@/server/functions/jobs.functions';

import { useJobPolling } from './use-job-polling';
import {
  ACTIVE_STATUSES,
  MAX_PARALLEL,
  isTerminal,
  jobJsonRecordSchema,
} from './use-job-shared';

export type { ActiveJob, CompletedResult } from './use-job-shared';

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

const completedStatusSchema = z.enum([
  'completed',
  'completed_partial',
  'failed',
  'cancelled',
]);

const jobUpdatePayloadSchema = z.object({
  kind: jobKindSchema.optional(),
  resultJson: jobJsonRecordSchema.nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

/**
 * Central hook for background jobs (AI tasks + non-AI tasks like
 * growth_recalc). Backs the Jobs page, the AI Assistant panel, and
 * any per-patient job widget.
 */
export function useJobs() {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const isAuthenticated =
    session?.user.id !== undefined &&
    session.user.id !== '' &&
    !isSessionPending;

  // --- store subscriptions ---
  const jobIds = useJobsStore((s) => s.jobIds);
  const completedResults = useJobsStore((s) => s.completedResults);
  const error = useJobsStore((s) => s.error);
  const processedStates = useJobsStore((s) => s.processedStates);
  const removedIds = useJobsStore((s) => s.removedIds);

  // --- store actions (stable references from the module-level store) ---
  const { addJob } = jobActions;
  const removeJobStore = jobActions.removeJob;
  const { resetAll } = jobActions;
  const { setError } = jobActions;
  const { trackStatus } = jobActions;
  const { setResult } = jobActions;
  const { clearResult } = jobActions;
  const { dismissResult } = jobActions;

  // --- fallback discovery — catches jobs started elsewhere ---
  const myJobsQuery = useQuery({
    queryKey: ['jobs', 'list', { limit: 20, offset: 0 }] as const,
    queryFn: async () => await listJobsFn({ data: { limit: 20, offset: 0 } }),
    enabled: isAuthenticated,
    refetchInterval: 5000,
    staleTime: 0,
    gcTime: 5 * 60_000,
  });

  // --- polling transport ---
  const { subscribe, unsubscribe, onUpdate, activeJobs } = useJobPolling({
    isAuthenticated,
  });

  useEffect(() => {
    subscribe(jobIds);

    return () => unsubscribe();
  }, [jobIds, subscribe, unsubscribe]);

  // --- live update handler ---
  const onUpdateHandlerRef = useRef<
    ((event: JobTransportEvent) => void) | null
  >(null);

  useEffect(() => {
    onUpdateHandlerRef.current = (event) => {
      const { jobId, status, data } = event;
      const prevStatus = processedStates[jobId];

      if (prevStatus === status) {
        return;
      }

      trackStatus(jobId, status);

      const parsedData = jobUpdatePayloadSchema.safeParse(data);

      const kind: JobKind = parsedData.success
        ? (parsedData.data.kind ?? 'ai_soap_draft')
        : 'ai_soap_draft';

      const parsedStatus = completedStatusSchema.safeParse(status);

      const resultStatus: CompletedResult['status'] = parsedStatus.success
        ? parsedStatus.data
        : 'completed';

      const errorMessage = parsedData.success
        ? (parsedData.data.errorMessage ?? null)
        : null;

      const baseResult: CompletedResult = {
        jobId,
        kind,
        status: resultStatus,
        result: parsedData.success
          ? (parsedData.data.resultJson ?? null)
          : null,
        errorMessage,
        timestamp: Date.now(),
      };

      if (status === 'completed' || status === 'completed_partial') {
        setResult({ ...baseResult, errorMessage });

        if (
          status === 'completed_partial' &&
          errorMessage !== null &&
          errorMessage !== ''
        ) {
          setError(errorMessage);
        }
      }

      if (status === 'failed') {
        setError(errorMessage ?? 'Job failed');
        clearResult(jobId);
      }

      if (status === 'cancelled') {
        clearResult(jobId);
      }
    };
  });

  useEffect(() => {
    onUpdate((event) => onUpdateHandlerRef.current?.(event));
  }, [onUpdate]);

  // --- merge discovered jobs from the server fallback ---
  useEffect(() => {
    const items = myJobsQuery.data?.items;

    if (items === undefined) {
      return;
    }

    for (const j of items) {
      if (
        ACTIVE_STATUSES.has(j.status) &&
        !removedIds.includes(j.id) &&
        !jobIds.includes(j.id)
      ) {
        addJob(j.id);
      }
    }
  }, [myJobsQuery.data, removedIds, jobIds, addJob]);

  // --- auto-remove terminal jobs after 5s ---
  useEffect(() => {
    const timers = jobIds
      .filter((id) => {
        const ev = processedStates[id] ?? '';

        return ev !== '' && isTerminal(ev);
      })
      .map((id) => setTimeout(() => removeJobStore(id), 5000));

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [processedStates, jobIds, removeJobStore]);

  // --- cancel + forget ---
  const removeJob = (id: string) => {
    void cancelJobFn({ data: { id } }).catch(() => null);
    removeJobStore(id);
  };

  const activeCount = activeJobs.length;
  const canAddMore = activeCount < MAX_PARALLEL;
  const isGenerating = activeCount > 0;

  return {
    jobIds,
    activeJobs,
    completedResults,
    activeCount,
    isGenerating,
    canAddMore,
    error,
    addJob,
    removeJob,
    resetAll,
    dismissResult,
    setError,
    myJobsQuery,
  };
}

/* ──────────────────────────────────────────────────────────────
 *  Job category hooks — thin wrappers, one per workflow
 * ────────────────────────────────────────────────────────────── */

export function useAiJobs() {
  const all = useJobs();
  const aiActive = all.activeJobs.filter((j) => j.kind.startsWith('ai_'));

  const aiResults = Object.values(all.completedResults).filter((r) =>
    r.kind.startsWith('ai_'),
  );

  return { ...all, activeJobs: aiActive, completedResults: aiResults };
}

export function useBackgroundJobs() {
  const all = useJobs();
  const bgActive = all.activeJobs.filter((j) => !j.kind.startsWith('ai_'));

  const bgResults = Object.values(all.completedResults).filter(
    (r) => !r.kind.startsWith('ai_'),
  );

  return { ...all, activeJobs: bgActive, completedResults: bgResults };
}
