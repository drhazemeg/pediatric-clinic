import type { QueryClient } from '@tanstack/react-query';

// src/features/prescriptions/queries-and-mutations.options.ts
import { mutationOptions, queryOptions } from '@tanstack/react-query';

import {
  countPatientPrescriptionsFn,
  createPrescriptionBatchFn,
  createPrescriptionRecordFn,
  deletePrescriptionFn,
  findFormularyDrugFn,
  getDrugMonographFn,
  getPatientAndVisitForPrescriptionFn,
  getPrescriptionFn,
  getPrescriptionWithContextFn,
  listActivePatientPrescriptionsFn,
  listOtherActivePrescriptionsFn,
  listPatientPrescriptionsFn,
  listPrescriptionRegisterFn,
  listPrescriptionsByPrescriberFn,
  listVisitPrescriptionsFn,
  renewPrescriptionFn,
  savePrescriptionTransactionalFn,
  searchDrugFormularyFn,
  topMedicationsForClinicFn,
  updatePrescriptionFn,
} from '@/server/functions/prescriptions.functions';

export type PrescriptionStatusFilter =
  | 'all'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface PrescriptionRegisterParams {
  clinicId: string;
  q?: string;
  medication?: string;
  prescriberId?: string;
  status?: PrescriptionStatusFilter;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export type CreatePrescriptionRecordInput = Parameters<
  typeof createPrescriptionRecordFn
>[0]['data'];

export type SavePrescriptionTransactionalInput = Parameters<
  typeof savePrescriptionTransactionalFn
>[0]['data'];

export type UpdatePrescriptionRecordInput = Parameters<
  typeof updatePrescriptionFn
>[0]['data'];

export type RenewPrescriptionInput = Parameters<
  typeof renewPrescriptionFn
>[0]['data'];

export type DeletePrescriptionInput = Parameters<
  typeof deletePrescriptionFn
>[0]['data'];

export const prescriptionQueryKeys = {
  all: ['prescriptions'] as const,
  detail: (id: string) => [...prescriptionQueryKeys.all, 'detail', id] as const,
  context: (id: string) =>
    [...prescriptionQueryKeys.all, 'context', id] as const,
  byVisit: (visitId: string) =>
    [...prescriptionQueryKeys.all, 'visit', visitId] as const,
  byPatient: (patientId: string) =>
    [...prescriptionQueryKeys.all, 'patient', patientId] as const,
  activeByPatient: (patientId: string) =>
    [...prescriptionQueryKeys.byPatient(patientId), 'active'] as const,
  otherActive: (patientId: string, excludeId?: string) =>
    [
      ...prescriptionQueryKeys.byPatient(patientId),
      'other-active',
      excludeId ?? '',
    ] as const,
  countByPatient: (patientId: string) =>
    [...prescriptionQueryKeys.byPatient(patientId), 'count'] as const,
  byPrescriber: (userId: string, limit = 100) =>
    [...prescriptionQueryKeys.all, 'prescriber', userId, limit] as const,
  register: (params: PrescriptionRegisterParams) =>
    [
      ...prescriptionQueryKeys.all,
      'register',
      {
        clinicId: params.clinicId,
        q: params.q?.trim() ?? '',
        medication: params.medication?.trim() ?? '',
        prescriberId: params.prescriberId ?? '',
        status: params.status ?? 'all',
        from: params.from ?? '',
        to: params.to ?? '',
        page: params.page ?? 1,
        size: params.size ?? 25,
      },
    ] as const,
  patientVisitContext: (
    clinicId: string,
    patientId: string,
    visitId?: string,
  ) =>
    [
      ...prescriptionQueryKeys.all,
      'encounter-context',
      clinicId,
      patientId,
      visitId ?? '',
    ] as const,
  formularyDrug: (name: string) =>
    [
      ...prescriptionQueryKeys.all,
      'formulary',
      name.trim().toLowerCase(),
    ] as const,
  formularySearch: (query: string, limit: number) =>
    [
      ...prescriptionQueryKeys.all,
      'formulary-search',
      query.trim().toLowerCase(),
      limit,
    ] as const,
  drugMonograph: (drugId: string) =>
    [...prescriptionQueryKeys.all, 'monograph', drugId] as const,
  topClinicMedications: (clinicId: string, limit = 20) =>
    [...prescriptionQueryKeys.all, 'clinic', clinicId, 'top', limit] as const,
};

export const prescriptionQueryOptions = {
  detail: (id: string) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.detail(id),
      queryFn: async () => await getPrescriptionFn({ data: { id } }),
      staleTime: 20_000,
      gcTime: 10 * 60_000,
    }),

  context: (id: string) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.context(id),
      queryFn: async () => await getPrescriptionWithContextFn({ data: { id } }),
      staleTime: 20_000,
      gcTime: 10 * 60_000,
    }),

  byVisit: (visitId: string) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.byVisit(visitId),
      queryFn: async () =>
        await listVisitPrescriptionsFn({ data: { visitId } }),
      staleTime: 20_000,
      gcTime: 10 * 60_000,
    }),

  byPatient: (patientId: string) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.byPatient(patientId),
      queryFn: async () =>
        await listPatientPrescriptionsFn({ data: { patientId } }),
      staleTime: 20_000,
      gcTime: 10 * 60_000,
    }),

  activeByPatient: (patientId: string) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.activeByPatient(patientId),
      queryFn: async () =>
        await listActivePatientPrescriptionsFn({ data: { patientId } }),
      staleTime: 15_000,
      gcTime: 10 * 60_000,
    }),

  otherActive: (patientId: string, excludeId?: string) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.otherActive(patientId, excludeId),
      queryFn: async () =>
        await listOtherActivePrescriptionsFn({
          data: { patientId, excludeId },
        }),
      staleTime: 15_000,
      gcTime: 5 * 60_000,
    }),

  countByPatient: (patientId: string) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.countByPatient(patientId),
      queryFn: async () =>
        await countPatientPrescriptionsFn({ data: { patientId } }),
      staleTime: 30_000,
      gcTime: 10 * 60_000,
    }),

  byPrescriber: (userId: string, limit = 100) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.byPrescriber(userId, limit),
      queryFn: async () =>
        await listPrescriptionsByPrescriberFn({ data: { userId, limit } }),
      staleTime: 30_000,
      gcTime: 10 * 60_000,
    }),

  register: (params: PrescriptionRegisterParams) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.register(params),
      queryFn: async () => {
        const q = params.q?.trim();
        const medication = params.medication?.trim();

        return await listPrescriptionRegisterFn({
          data: {
            clinicId: params.clinicId,
            q: q !== undefined && q !== '' ? q : undefined,
            medication:
              medication !== undefined && medication !== ''
                ? medication
                : undefined,
            prescriberId: params.prescriberId,
            status: params.status ?? 'all',
            from: params.from,
            to: params.to,
            page: params.page ?? 1,
            size: params.size ?? 25,
          },
        });
      },
      staleTime: 15_000,
      gcTime: 5 * 60_000,
    }),

  patientVisitContext: (
    clinicId: string,
    patientId: string,
    visitId?: string,
  ) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.patientVisitContext(
        clinicId,
        patientId,
        visitId,
      ),
      queryFn: async () =>
        await getPatientAndVisitForPrescriptionFn({
          data: { clinicId, patientId, visitId },
        }),
      staleTime: 30_000,
      gcTime: 10 * 60_000,
    }),

  formularyDrug: (name: string) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.formularyDrug(name),
      queryFn: async () =>
        await findFormularyDrugFn({ data: { name: name.trim() } }),
      enabled: name.trim().length > 0,
      // Formulary reference monographs change infrequently.
      staleTime: 60 * 60_000,
      gcTime: 24 * 60 * 60_000,
    }),

  searchFormulary: (query: string, limit = 10, enabled = true) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.formularySearch(query, limit),
      queryFn: async () =>
        await searchDrugFormularyFn({
          data: { query: query.trim(), limit },
        }),
      enabled: enabled && query.trim().length >= 2,
      staleTime: 60 * 60_000,
    }),

  drugMonograph: (drugId: string, enabled = true) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.drugMonograph(drugId),
      queryFn: async () => await getDrugMonographFn({ data: { drugId } }),
      enabled: enabled && drugId.length > 0,
      staleTime: 60 * 60_000,
    }),

  topClinicMedications: (clinicId: string, limit = 20) =>
    queryOptions({
      queryKey: prescriptionQueryKeys.topClinicMedications(clinicId, limit),
      queryFn: async () =>
        await topMedicationsForClinicFn({ data: { clinicId, limit } }),
      staleTime: 60_000,
      gcTime: 15 * 60_000,
    }),
};

const invalidatePrescriptionQueries = async (
  queryClient: QueryClient,
  opts: { id?: string; patientId?: string; visitId?: string },
) => {
  const tasks: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({
      queryKey: [...prescriptionQueryKeys.all, 'register'],
    }),
    queryClient.invalidateQueries({
      queryKey: [...prescriptionQueryKeys.all, 'prescriber'],
    }),
    queryClient.invalidateQueries({
      queryKey: [...prescriptionQueryKeys.all, 'clinic'],
    }),
  ];

  if (opts.id !== undefined && opts.id !== '') {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: prescriptionQueryKeys.detail(opts.id),
      }),
      queryClient.invalidateQueries({
        queryKey: prescriptionQueryKeys.context(opts.id),
      }),
    );
  }

  if (opts.patientId !== undefined && opts.patientId !== '') {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: prescriptionQueryKeys.byPatient(opts.patientId),
      }),
    );
  }

  if (opts.visitId !== undefined && opts.visitId !== '') {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: prescriptionQueryKeys.byVisit(opts.visitId),
      }),
    );
  }

  await Promise.all(tasks);
};

interface PrescriptionMutationIds {
  id?: string | null;
  patientId?: string | null;
  visitId?: string | null;
}

const toIds = (value: PrescriptionMutationIds | undefined) => ({
  id: value?.id ?? undefined,
  patientId: value?.patientId ?? undefined,
  visitId: value?.visitId ?? undefined,
});

export function createPrescriptionRecordMutationOptions(
  queryClient: QueryClient,
) {
  return mutationOptions({
    mutationKey: ['prescriptions', 'create'] as const,
    mutationFn: async (input: CreatePrescriptionRecordInput) =>
      await createPrescriptionRecordFn({ data: input }),
    onSuccess: async (row, variables) => {
      const ids = toIds(row);

      await invalidatePrescriptionQueries(queryClient, {
        id: ids.id,
        patientId: ids.patientId ?? variables.patientId,
        visitId: ids.visitId ?? variables.visitId,
      });
    },
  });
}

export function createPrescriptionsBatchMutationOptions(
  queryClient: QueryClient,
) {
  return mutationOptions({
    mutationKey: ['prescriptions', 'create-batch'] as const,
    mutationFn: async (rows: Array<CreatePrescriptionRecordInput>) =>
      await createPrescriptionBatchFn({ data: { rows } }),
    onSuccess: async (rows, variables) => {
      const created = Array.isArray(rows) ? rows : [];

      const patientIds = new Set<string>([
        ...variables.map((r) => r.patientId),
        ...created.flatMap((r) => (r.patientId === '' ? [] : [r.patientId])),
      ]);

      const visitIds = new Set<string>([
        ...variables.map((r) => r.visitId),
        ...created.flatMap((r) => (r.visitId === '' ? [] : [r.visitId])),
      ]);

      await Promise.all([
        ...[...patientIds].map(
          async (patientId) =>
            await invalidatePrescriptionQueries(queryClient, { patientId }),
        ),
        ...[...visitIds].map(
          async (visitId) =>
            await queryClient.invalidateQueries({
              queryKey: prescriptionQueryKeys.byVisit(visitId),
            }),
        ),
      ]);
    },
  });
}

export function savePrescriptionTransactionalMutationOptions(
  queryClient: QueryClient,
) {
  return mutationOptions({
    mutationKey: ['prescriptions', 'save-transactional'] as const,
    mutationFn: async (input: SavePrescriptionTransactionalInput) =>
      await savePrescriptionTransactionalFn({ data: input }),
    onSuccess: async (saved, variables) => {
      const ids = toIds(saved);

      await invalidatePrescriptionQueries(queryClient, {
        id: ids.id ?? variables.prescriptionId,
        patientId: ids.patientId ?? variables.patientId,
        visitId: ids.visitId ?? variables.visitId,
      });
    },
  });
}

export function updatePrescriptionMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['prescriptions', 'update'] as const,
    mutationFn: async (input: UpdatePrescriptionRecordInput) =>
      await updatePrescriptionFn({ data: input }),
    onSuccess: async (row, variables) => {
      const ids = toIds(row);

      await invalidatePrescriptionQueries(queryClient, {
        id: ids.id ?? variables.id,
        patientId: ids.patientId,
        visitId: ids.visitId,
      });
    },
  });
}

export function renewPrescriptionMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['prescriptions', 'renew'] as const,
    mutationFn: async (input: RenewPrescriptionInput) =>
      await renewPrescriptionFn({ data: input }),
    onSuccess: async (renewed, variables) => {
      const ids = toIds(renewed);

      await invalidatePrescriptionQueries(queryClient, {
        id: ids.id ?? variables.id,
        patientId: ids.patientId,
        visitId: ids.visitId,
      });
    },
  });
}

export function deletePrescriptionMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['prescriptions', 'delete'] as const,
    mutationFn: async (input: DeletePrescriptionInput) =>
      await deletePrescriptionFn({ data: input }),
    onSuccess: async (_res, variables) => {
      await invalidatePrescriptionQueries(queryClient, {
        id: variables.id,
        patientId: variables.patientId,
        visitId: variables.visitId,
      });
    },
  });
}

export function cancelPrescriptionMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['prescriptions', 'cancel'] as const,
    mutationFn: async ({ id }: { id: string }) =>
      await updatePrescriptionFn({
        data: { id, patch: { status: 'cancelled' } },
      }),
    onSuccess: async (row, variables) => {
      const ids = toIds(row);

      await invalidatePrescriptionQueries(queryClient, {
        id: variables.id,
        patientId: ids.patientId,
        visitId: ids.visitId,
      });
    },
  });
}
