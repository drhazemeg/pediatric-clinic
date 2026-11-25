// apps/web/src/hooks/use-active-clinic.ts

import { useEffect } from 'react';
import { z } from 'zod';

import { clinicalActions } from '@/integrations/tanstack-store/clinical-store';
import { authClient } from '@/lib/auth-client';

import { useActiveClinicName } from './use-clinic-store';

export const DEFAULT_HURGHADA_CLINIC_ID = 'clinic_hurghada_pediatrics';

const activeClinicUserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  role: z.string().optional(),
  clinicId: z.string().nullable().optional(),
});

export function useActiveClinic() {
  const { data: session, isPending } = authClient.useSession();
  const parsedUser = activeClinicUserSchema.safeParse(session?.user);
  const user = parsedUser.success ? parsedUser.data : undefined;

  const clinicId =
    user?.clinicId !== undefined &&
    user.clinicId !== null &&
    user.clinicId !== ''
      ? user.clinicId
      : DEFAULT_HURGHADA_CLINIC_ID;

  const clinicName = useActiveClinicName();

  return {
    session,
    user,
    clinicId,
    clinicName,
    isPending,
  };
}

export function useActiveClinicId(): string {
  const { clinicId } = useActiveClinic();

  return clinicId;
}

export function useHydrateActiveClinic(
  seed: { clinicId: string; clinicName: string } | null,
) {
  useEffect(() => {
    if (seed === null || seed.clinicId === '') {
      return;
    }

    clinicalActions.setActiveClinic({
      id: seed.clinicId,
      name: seed.clinicName,
    });
  }, [seed]);
}
