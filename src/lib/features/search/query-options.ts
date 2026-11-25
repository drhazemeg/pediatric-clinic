import { queryOptions } from '@tanstack/react-query';

import { globalClinicSearchFn } from '@/server/functions/search.functions';

export const searchQueryKeys = {
  all: ['search'] as const,
  clinic: (clinicId: string, q: string) =>
    [...searchQueryKeys.all, 'clinic', clinicId, q.trim()] as const,
};

export const searchQueryOptions = {
  clinic: (clinicId: string, q: string) => {
    const trimmed = q.trim();

    return queryOptions({
      queryKey: searchQueryKeys.clinic(clinicId, trimmed),
      queryFn: async () =>
        await globalClinicSearchFn({ data: { clinicId, q: trimmed } }),
      enabled: clinicId.length > 0 && trimmed.length > 0,
      staleTime: 15_000,
      gcTime: 5 * 60_000,
    });
  },
};
