import type { Subscription } from '@tanstack/react-store';

import { batch, createStore, useSelector } from '@tanstack/react-store';
import { z } from 'zod';

// =============================================================================
// Types
// =============================================================================

// -----------------------------------------------------------------------------
// Clinic
// -----------------------------------------------------------------------------
export interface ActiveClinicState {
  id: string;
  name: string;
  code: string;
  branch: string;
  locale: 'ar' | 'en';
}

// -----------------------------------------------------------------------------
// Queue
// -----------------------------------------------------------------------------

export type QueueStatus = 'waiting' | 'in_vitals' | 'with_doctor' | 'done';

export interface QueueEntry {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  priority: 0 | 1 | 2;
  status: QueueStatus;
  enqueuedAt: number;
}

// -----------------------------------------------------------------------------
// Clinical encounters
// -----------------------------------------------------------------------------

export interface SoapEncounterDraft {
  visitId: string;
  patientId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  weightKg?: number;
  vitals?: {
    temp?: number;
    hr?: number;
    rr?: number;
    spo2?: number;
    bp?: string;
  };
  diagnoses?: Array<string>;
  lastModified: number;
}

// -----------------------------------------------------------------------------
// Offline mutation outbox
// -----------------------------------------------------------------------------

export type OfflineEntityType =
  | 'visit'
  | 'patient'
  | 'vitals'
  | 'prescription'
  | 'queue';

export type MutationAction = 'create' | 'update' | 'delete';

export type MutationSyncStatus = 'pending' | 'syncing' | 'failed';

export interface OfflineMutationItem {
  id: string;
  entityType: OfflineEntityType;
  action: MutationAction;
  payload: unknown;
  queuedAt: number;
  syncStatus: MutationSyncStatus;
  retryCount: number;
  error?: string;
}

// -----------------------------------------------------------------------------
// Finance
// -----------------------------------------------------------------------------

export interface LedgerSummary {
  totalRevenueCents: number;
  totalExpenseCents: number;
  netBalanceCents: number;
}

// -----------------------------------------------------------------------------
// AI
// -----------------------------------------------------------------------------

export interface AiResult {
  status: 'completed' | 'failed';
  result?: unknown;
  errorMessage?: string;
}

// =============================================================================
// State
// =============================================================================

export interface ClinicalState {
  activeClinic: ActiveClinicState;
  clinics: Array<ActiveClinicState>;

  queue: Array<QueueEntry>;

  ledger: LedgerSummary;

  aiResults: Record<string, AiResult>;

  // Multiple drafts prevent losing data when switching encounters.
  drafts: Record<string, SoapEncounterDraft>;
  activeDraftVisitId: string | null;

  // Local-first mutation queue.
  outbox: Array<OfflineMutationItem>;
}

// =============================================================================
// Initial state
// =============================================================================

const DEFAULT_CLINIC: ActiveClinicState = {
  id: 'clinic_hurghada_pediatrics',
  name: 'عيادة د. حازم علي لطب الأطفال والرضاعة بالغردقة',
  code: 'HRG-PED-01',
  branch: 'Hurghada',
  locale: 'ar',
};

const DEFAULT_LEDGER: LedgerSummary = {
  totalRevenueCents: 0,
  totalExpenseCents: 0,
  netBalanceCents: 0,
};

const createInitialState = (): ClinicalState => ({
  activeClinic: { ...DEFAULT_CLINIC },
  clinics: [{ ...DEFAULT_CLINIC }],
  queue: [],
  ledger: { ...DEFAULT_LEDGER },
  aiResults: {},
  drafts: {},
  activeDraftVisitId: null,
  outbox: [],
});

// =============================================================================
// Store
// =============================================================================

export const clinicalStore = createStore<ClinicalState>(createInitialState());

const selectFullClinicalState = (state: ClinicalState): ClinicalState => state;

export function useClinicStore(): ClinicalState;
export function useClinicStore<T>(selector: (state: ClinicalState) => T): T;
export function useClinicStore<T>(
  selector?: (state: ClinicalState) => T,
): ClinicalState | T {
  const activeSelector: (state: ClinicalState) => ClinicalState | T =
    selector ?? selectFullClinicalState;

  return useSelector(clinicalStore, activeSelector);
}

// =============================================================================
// Derived stores
// =============================================================================

// -----------------------------------------------------------------------------
// Clinic
// -----------------------------------------------------------------------------

export const activeClinicStore = createStore(
  () => clinicalStore.state.activeClinic,
);

export const hasActiveClinicStore = createStore(
  () => clinicalStore.state.activeClinic.id.length > 0,
);

// -----------------------------------------------------------------------------
// Queue statistics
// -----------------------------------------------------------------------------

export const queueCountsStore = createStore(() => {
  const { queue } = clinicalStore.state;

  return {
    total: queue.length,
    waiting: queue.filter((q) => q.status === 'waiting').length,
    inVitals: queue.filter((q) => q.status === 'in_vitals').length,
    withDoctor: queue.filter((q) => q.status === 'with_doctor').length,
    done: queue.filter((q) => q.status === 'done').length,
  };
});

export const waitingCountStore = createStore(
  () => queueCountsStore.state.waiting,
);

export const inVitalsCountStore = createStore(
  () => queueCountsStore.state.inVitals,
);

export const withDoctorCountStore = createStore(
  () => queueCountsStore.state.withDoctor,
);

// -----------------------------------------------------------------------------
// Encounter drafts
// -----------------------------------------------------------------------------

export const activeDraftStore = createStore(() => {
  const { state } = clinicalStore;
  const visitId = state.activeDraftVisitId;

  return visitId !== null && visitId !== ''
    ? (state.drafts[visitId] ?? null)
    : null;
});

export const draftsCountStore = createStore(
  () => Object.keys(clinicalStore.state.drafts).length,
);

// -----------------------------------------------------------------------------
// Outbox statistics
// -----------------------------------------------------------------------------

export const outboxCountsStore = createStore(() => {
  const { outbox } = clinicalStore.state;

  return {
    total: outbox.length,
    pending: outbox.filter((m) => m.syncStatus === 'pending').length,
    syncing: outbox.filter((m) => m.syncStatus === 'syncing').length,
    failed: outbox.filter((m) => m.syncStatus === 'failed').length,
  };
});

// =============================================================================
// Actions
// =============================================================================

export const clinicalActions = {
  // -------------------------------------------------------------------------
  // Clinic
  // -------------------------------------------------------------------------

  setActiveClinic(clinic: Partial<ActiveClinicState>) {
    clinicalStore.setState((state) => ({
      ...state,
      activeClinic: {
        ...state.activeClinic,
        ...clinic,
      },
    }));
  },

  addClinic(clinic: ActiveClinicState) {
    clinicalStore.setState((state) => ({
      ...state,
      clinics: [
        ...state.clinics.filter((existing) => existing.id !== clinic.id),
        { ...clinic },
      ],
      activeClinic: { ...clinic },
    }));
  },

  enqueue(entry: QueueEntry) {
    batch(() => {
      clinicalStore.setState((s) => ({ ...s, queue: [...s.queue, entry] }));
    });
  },

  setClinicLocale(locale: ActiveClinicState['locale']) {
    clinicalStore.setState((state) => ({
      ...state,
      activeClinic: {
        ...state.activeClinic,
        locale,
      },
    }));
  },

  toggleLocale() {
    clinicalStore.setState((state) => ({
      ...state,
      activeClinic: {
        ...state.activeClinic,
        locale: state.activeClinic.locale === 'ar' ? 'en' : 'ar',
      },
    }));
  },

  // -------------------------------------------------------------------------
  // Queue
  // -------------------------------------------------------------------------

  setQueue(entries: Array<QueueEntry>) {
    clinicalStore.setState((state) => ({
      ...state,
      queue: entries,
    }));
  },

  updateQueueStatus(entryId: string, status: QueueStatus) {
    clinicalStore.setState((state) => ({
      ...state,
      queue: state.queue.map((entry) =>
        entry.id === entryId ? { ...entry, status } : entry,
      ),
    }));
  },

  removeFromQueue(entryId: string) {
    clinicalStore.setState((state) => ({
      ...state,
      queue: state.queue.filter((entry) => entry.id !== entryId),
    }));
  },

  // -------------------------------------------------------------------------
  // Ledger
  // -------------------------------------------------------------------------

  setLedger(ledger: LedgerSummary) {
    clinicalStore.setState((state) => ({
      ...state,
      ledger,
    }));
  },

  // -------------------------------------------------------------------------
  // SOAP drafts
  // -------------------------------------------------------------------------

  activateDraft(visitId: string) {
    clinicalStore.setState((state) => ({
      ...state,
      activeDraftVisitId: visitId,
    }));
  },

  saveDraft(
    draft: Partial<SoapEncounterDraft> & {
      visitId: string;
      patientId: string;
    },
  ) {
    clinicalStore.setState((state) => {
      const existing = state.drafts[draft.visitId];

      const updatedDraft: SoapEncounterDraft = {
        ...existing,
        ...draft,
        visitId: draft.visitId,
        patientId: draft.patientId,
        lastModified: Date.now(),
      };

      return {
        ...state,
        drafts: {
          ...state.drafts,
          [draft.visitId]: updatedDraft,
        },
        activeDraftVisitId: draft.visitId,
      };
    });
  },

  clearDraft(visitId: string) {
    clinicalStore.setState((state) => {
      const { [visitId]: _removed, ...drafts } = state.drafts;

      return {
        ...state,
        drafts,
        activeDraftVisitId:
          state.activeDraftVisitId === visitId
            ? null
            : state.activeDraftVisitId,
      };
    });
  },

  clearAllDrafts() {
    clinicalStore.setState((state) => ({
      ...state,
      drafts: {},
      activeDraftVisitId: null,
    }));
  },

  // -------------------------------------------------------------------------
  // Offline mutation outbox
  // -------------------------------------------------------------------------

  enqueueMutation(
    item: Omit<
      OfflineMutationItem,
      'id' | 'queuedAt' | 'syncStatus' | 'retryCount' | 'error'
    >,
  ) {
    clinicalStore.setState((state) => ({
      ...state,
      outbox: [
        ...state.outbox,
        {
          ...item,
          id: globalThis.crypto.randomUUID(),
          queuedAt: Date.now(),
          syncStatus: 'pending',
          retryCount: 0,
        },
      ],
    }));
  },

  markMutationSyncing(id: string) {
    clinicalStore.setState((state) => ({
      ...state,
      outbox: state.outbox.map((item) =>
        item.id === id
          ? { ...item, syncStatus: 'syncing', error: undefined }
          : item,
      ),
    }));
  },

  markMutationSynced(id: string) {
    clinicalStore.setState((state) => ({
      ...state,
      outbox: state.outbox.filter((item) => item.id !== id),
    }));
  },

  markMutationFailed(id: string, error: string) {
    clinicalStore.setState((state) => ({
      ...state,
      outbox: state.outbox.map((item) =>
        item.id === id
          ? {
              ...item,
              syncStatus: 'failed',
              error,
              retryCount: item.retryCount + 1,
            }
          : item,
      ),
    }));
  },

  retryMutation(id: string) {
    clinicalStore.setState((state) => ({
      ...state,
      outbox: state.outbox.map((item) =>
        item.id === id && item.syncStatus === 'failed'
          ? { ...item, syncStatus: 'pending', error: undefined }
          : item,
      ),
    }));
  },

  clearOutbox() {
    clinicalStore.setState((state) => ({
      ...state,
      outbox: [],
    }));
  },

  // -------------------------------------------------------------------------
  // AI results
  // -------------------------------------------------------------------------

  recordAiResult(jobId: string, payload: AiResult) {
    clinicalStore.setState((state) => ({
      ...state,
      aiResults: {
        ...state.aiResults,
        [jobId]: payload,
      },
    }));
  },

  clearAiResult(jobId: string) {
    clinicalStore.setState((state) => {
      const { [jobId]: _removed, ...aiResults } = state.aiResults;

      return {
        ...state,
        aiResults,
      };
    });
  },

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  reset() {
    clinicalStore.setState(() => createInitialState());
  },
};

// =============================================================================
// Safe persistence: non-sensitive clinic preferences only
// =============================================================================

const PREFERENCES_KEY = 'smart-clinic-preferences-v1';

let persistenceSubscription: Subscription | undefined;

const clinicalPreferencesSchema = z.object({
  activeClinic: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      code: z.string().optional(),
      branch: z.string().optional(),
      locale: z.enum(['ar', 'en']).optional(),
    })
    .optional(),
});

export function initializeClinicalStore() {
  if (typeof window === 'undefined' || persistenceSubscription !== undefined) {
    return;
  }

  try {
    const stored = window.localStorage.getItem(PREFERENCES_KEY);

    if (stored !== null && stored !== '') {
      const parsedPreferences = clinicalPreferencesSchema.safeParse(
        JSON.parse(stored),
      );

      if (
        parsedPreferences.success &&
        parsedPreferences.data.activeClinic !== undefined
      ) {
        clinicalActions.setActiveClinic(parsedPreferences.data.activeClinic);
      }
    }
  } catch {
    // Ignore unavailable or malformed local preferences.
  }

  persistenceSubscription = clinicalStore.subscribe(() => {
    try {
      window.localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({
          activeClinic: clinicalStore.state.activeClinic,
        }),
      );
    } catch {
      // Storage may be unavailable or full.
    }
  });
}
