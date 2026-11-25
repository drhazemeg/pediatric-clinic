import { queryOptions } from '@tanstack/react-query';

import { getClinicJobFn } from '@/server/functions/jobs.functions';

export const jobQueryKeys = {
  all: ['jobs'] as const,
  detail: (id: string) => [...jobQueryKeys.all, 'detail', id] as const,
};

export const jobQueryOptions = {
  get: (id: string, enabled = true) =>
    queryOptions({
      queryKey: jobQueryKeys.detail(id),
      queryFn: async () => await getClinicJobFn({ data: { id } }),
      enabled: enabled && id.length > 0,
      refetchInterval: 1000,
    }),
};
