// apps/web/src/routes/_app/route.tsx
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { useHydrateActiveClinic } from '@/hooks/use-active-clinic';
import { authClient } from '@/lib/auth-client';
import { routeShell } from '@/lib/web/route-shell';

const sessionUserClinicSchema = z.object({
  clinicId: z.string().nullish(),
});

const AppLayoutComponent = () => {
  const { clinicId } = Route.useRouteContext();
  useHydrateActiveClinic(clinicId ? { clinicId, clinicName: '' } : null);

  return <Outlet />;
};

export const Route = createFileRoute('/_app')({
  staticData: routeShell.app,
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
      throw redirect({
        to: '/login',
        search: {
          lang: 'ar',
          redirectTo: location.pathname,
        },
      });
    }

    const parsedUser = sessionUserClinicSchema.safeParse(session.data.user);

    const clinicId = parsedUser.success ? (parsedUser.data.clinicId ?? '') : '';

    return { session, clinicId };
  },
  component: AppLayoutComponent,
});
