import { mutationOptions, queryOptions } from '@tanstack/react-query';

import {
  createAppointmentFn,
  listRangeAppointmentsFn,
  listTodayClinicAppointmentsFn,
  transitionAppointmentStatusFn,
} from '@/server/functions/appointments.functions';

export const appointmentQueryKeys = {
  all: ['appointments'] as const,
  today: (clinicId: string) =>
    [...appointmentQueryKeys.all, 'today', clinicId] as const,
  inRange: (input?: {
    clinicId: string;
    from: Date;
    to: Date;
    doctorId?: string;
  }) => [...appointmentQueryKeys.all, 'range', input] as const,
};

export const appointmentQueryOptions = {
  today: (clinicId: string, enabled = true) =>
    queryOptions({
      queryKey: appointmentQueryKeys.today(clinicId),
      queryFn: async () =>
        await listTodayClinicAppointmentsFn({ data: { clinicId } }),
      enabled: enabled && clinicId.length > 0,
      refetchInterval: 30_000,
    }),
  inRange: (
    input: { clinicId: string; from: Date; to: Date; doctorId?: string },
    enabled = true,
  ) =>
    queryOptions({
      queryKey: appointmentQueryKeys.inRange(input),
      queryFn: async () => await listRangeAppointmentsFn({ data: input }),
      enabled: enabled && input.clinicId.length > 0,
    }),
};

const APPOINTMENT_STATUS_ACTION = {
  completed: 'complete',
  cancelled: 'cancel',
  'no-show': 'no-show',
} as const;

export const appointmentMutationOptions = {
  create: () =>
    mutationOptions({
      mutationKey: ['appointments', 'create'] as const,
      mutationFn: async (
        input: Parameters<typeof createAppointmentFn>[0]['data'],
      ) => await createAppointmentFn({ data: input }),
    }),
  updateStatus: () =>
    mutationOptions({
      mutationKey: ['appointments', 'status'] as const,
      mutationFn: async (input: {
        id: string;
        status: 'completed' | 'cancelled' | 'no-show';
      }) =>
        await transitionAppointmentStatusFn({
          data: {
            id: input.id,
            action: APPOINTMENT_STATUS_ACTION[input.status],
          },
        }),
    }),
};
