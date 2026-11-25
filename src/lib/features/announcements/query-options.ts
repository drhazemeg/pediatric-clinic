import { queryOptions } from '@tanstack/react-query';

import { getActiveAnnouncementFn } from '@/server/functions/announcements.functions';

export const announcementQueryOptions = {
  active: () =>
    queryOptions({
      queryKey: ['announcements', 'active'] as const,
      queryFn: async () => await getActiveAnnouncementFn(),
      staleTime: 60_000,
    }),
};
