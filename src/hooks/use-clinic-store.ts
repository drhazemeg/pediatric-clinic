// apps/web/src/hooks/use-clinic-store.ts

import { shallow, useSelector } from '@tanstack/react-store';

import {
  clinicalStore as clinicStore,
  hasActiveClinicStore,
  inVitalsCountStore,
  waitingCountStore,
  withDoctorCountStore,
} from '#/integrations/tanstack-store/clinical-store.ts';

export function useActiveClinicId(): string {
  return useSelector(clinicStore, (s) => s.activeClinic.id);
}

export function useActiveClinicName(): string {
  return useSelector(clinicStore, (s) => s.activeClinic.name);
}

export function useHasActiveClinic(): boolean {
  return useSelector(hasActiveClinicStore, (s) => s);
}

export function useQueueSnapshot() {
  return useSelector(clinicStore, (s) => s.queue, { compare: shallow });
}

export function useQueueCounts() {
  return {
    waiting: useSelector(waitingCountStore, (s) => s),
    inVitals: useSelector(inVitalsCountStore, (s) => s),
    withDoctor: useSelector(withDoctorCountStore, (s) => s),
  };
}

export function useLedgerSummary() {
  return useSelector(clinicStore, (s) => s.ledger, { compare: shallow });
}

/** Subscribe to one AI job's terminal result by id. Re-renders only for that id. */
export function useAiJobResult(jobId: string | null) {
  return useSelector(
    clinicStore,
    (s) => (jobId !== null && jobId !== '' ? s.aiResults[jobId] : undefined),
    { compare: shallow },
  );
}
