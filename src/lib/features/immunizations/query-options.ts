import { mutationOptions, queryOptions } from '@tanstack/react-query';

import { ROUTINE_CHILDHOOD_SCHEDULE } from '@/lib/features/immunizations/types';
import {
  getImmunizationCoverageFn,
  getImmunizationMatrixFn,
  getPatientImmunizationsFn,
  recordImmunizationFn,
} from '@/server/functions/immunizations.functions';

export const immunizationQueryKeys = {
  all: ['immunizations'] as const,
  schedule: () => [...immunizationQueryKeys.all, 'schedule'] as const,
  byPatient: (patientId: string) =>
    [...immunizationQueryKeys.all, 'patient', patientId] as const,
  matrix: (
    clinicId: string,
    options?: { ageBracket?: string; onlyOverdue?: boolean },
  ) => [...immunizationQueryKeys.all, 'matrix', clinicId, options] as const,
  coverage: (clinicId: string) =>
    [...immunizationQueryKeys.all, 'coverage', clinicId] as const,
};

export const immunizationQueryOptions = {
  schedule: () =>
    queryOptions({
      queryKey: immunizationQueryKeys.schedule(),
      queryFn: async () => {
        await Promise.resolve();

        return ROUTINE_CHILDHOOD_SCHEDULE;
      },
      staleTime: Number.POSITIVE_INFINITY,
    }),
  byPatient: (patientId: string, enabled = true) =>
    queryOptions({
      queryKey: immunizationQueryKeys.byPatient(patientId),
      queryFn: async () =>
        await getPatientImmunizationsFn({ data: { patientId } }),
      enabled: enabled && patientId.length > 0,
    }),
  matrix: (
    input: {
      clinicId: string;
      ageBracket?: '0-6' | '6-12' | '12-24' | '>24';
      onlyOverdue?: boolean;
    },
    enabled = true,
  ) =>
    queryOptions({
      queryKey: immunizationQueryKeys.matrix(input.clinicId, input),
      queryFn: async () => await getImmunizationMatrixFn({ data: input }),
      enabled: enabled && input.clinicId.length > 0,
    }),
  coverage: (clinicId: string, enabled = true) =>
    queryOptions({
      queryKey: immunizationQueryKeys.coverage(clinicId),
      queryFn: async () =>
        await getImmunizationCoverageFn({ data: { clinicId } }),
      enabled: enabled && clinicId.length > 0,
    }),
};

export const immunizationMutationOptions = {
  record: () =>
    mutationOptions({
      mutationKey: ['immunizations', 'record'] as const,
      mutationFn: async (
        input: Parameters<typeof recordImmunizationFn>[0]['data'],
      ) => await recordImmunizationFn({ data: input }),
    }),
};
