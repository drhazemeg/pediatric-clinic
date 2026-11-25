import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { authClient } from '@/lib/auth-client';

export const Route = createFileRoute('/_app/settings')({
  validateSearch: z.object({
    tab: z.enum(['ai', 'clinic', 'account']).catch('ai').default('ai'),
  }),
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      redirect({ to: '/login', throw: true });
    }

    return { session };
  },
});
