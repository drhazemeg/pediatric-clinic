import type { QueryClient } from '@tanstack/react-query';

import { mutationOptions, queryOptions } from '@tanstack/react-query';

import {
  countClinicsFn,
  createClinicFn,
  deleteClinicFn,
  getClinicFn,
  getClinicRosterFn,
  getClinicStatsFn,
  listClinicsFn,
  updateClinicFn,
} from '@/server/functions/clinic.functions';

export type CreateClinicInput = Parameters<typeof createClinicFn>[0]['data'];

export type UpdateClinicInput = Parameters<typeof updateClinicFn>[0]['data'];

export const clinicQueryKeys = {
  all: ['clinics'] as const,
  lists: () => [...clinicQueryKeys.all, 'list'] as const,
  count: () => [...clinicQueryKeys.all, 'count'] as const,
  details: () => [...clinicQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...clinicQueryKeys.details(), id] as const,
  stats: (clinicId: string) =>
    [...clinicQueryKeys.all, 'stats', clinicId] as const,
  roster: (clinicId: string) =>
    [...clinicQueryKeys.all, 'roster', clinicId] as const,
};

export const clinicQueryOptions = {
  list: () =>
    queryOptions({
      queryKey: clinicQueryKeys.lists(),
      queryFn: async () => await listClinicsFn(),
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
    }),
  count: () =>
    queryOptions({
      queryKey: clinicQueryKeys.count(),
      queryFn: async () => await countClinicsFn(),
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: clinicQueryKeys.detail(id),
      queryFn: async () => await getClinicFn({ data: { id } }),
      staleTime: 2 * 60_000,
      gcTime: 15 * 60_000,
    }),
  stats: (clinicId: string) =>
    queryOptions({
      queryKey: clinicQueryKeys.stats(clinicId),
      queryFn: async () => await getClinicStatsFn({ data: { clinicId } }),
      staleTime: 30_000,
      gcTime: 10 * 60_000,
    }),
  roster: (clinicId: string) =>
    queryOptions({
      queryKey: clinicQueryKeys.roster(clinicId),
      queryFn: async () => await getClinicRosterFn({ data: { clinicId } }),
      staleTime: 60_000,
      gcTime: 15 * 60_000,
    }),
};

export function createClinicMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['clinics', 'create'] as const,
    mutationFn: async (input: CreateClinicInput) =>
      await createClinicFn({ data: input }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clinicQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: clinicQueryKeys.count() }),
      ]);
    },
  });
}

export function updateClinicMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['clinics', 'update'] as const,
    mutationFn: async (input: UpdateClinicInput) =>
      await updateClinicFn({ data: input }),
    onSuccess: async (row) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clinicQueryKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: clinicQueryKeys.detail(row.id),
        }),
        queryClient.invalidateQueries({
          queryKey: clinicQueryKeys.stats(row.id),
        }),
        queryClient.invalidateQueries({
          queryKey: clinicQueryKeys.roster(row.id),
        }),
      ]);
    },
  });
}

export function deleteClinicMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: ['clinics', 'delete'] as const,
    mutationFn: async (id: string) => await deleteClinicFn({ data: { id } }),
    onSuccess: async (_res, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clinicQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: clinicQueryKeys.count() }),
        queryClient.invalidateQueries({ queryKey: clinicQueryKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: clinicQueryKeys.stats(id) }),
        queryClient.invalidateQueries({ queryKey: clinicQueryKeys.roster(id) }),
      ]);
    },
  });
}
