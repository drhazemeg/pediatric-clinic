// oxlint-disable typescript/no-unsafe-type-assertion
import type { OfflineMutationItem } from '#/integrations/tanstack-store/clinical-store.ts';
import type { QueryClient } from '@tanstack/react-query';

import { addVisitMeasurementWithZScoreFn } from '@/server/functions/growth-and-development.functions';
import {
  createPatientFn,
  updatePatientFn,
} from '@/server/functions/patients.functions';
import { createPrescriptionRecordFn } from '@/server/functions/prescriptions.functions';
import {
  enqueueClinicPatientFn,
  updateQueueEntryStatusFn,
} from '@/server/functions/queue.functions';
import {
  createVisitFn,
  updateVisitFn,
} from '@/server/functions/visits.functions';

import { patientQueryKeys } from '../patients/queries.options';
import { prescriptionQueryKeys } from '../prescriptions/query-options';
import { visitQueryKeys } from '../visits/query-options';

export async function replayOfflineMutation(
  item: OfflineMutationItem,
  queryClient: QueryClient,
) {
  switch (item.entityType) {
    case 'visit': {
      if (item.action === 'create') {
        await createVisitFn({
          // SAFETY: Enqueued offline visit create payload conforms to createVisitFn input schema.
          data: item.payload as Parameters<typeof createVisitFn>[0]['data'],
        });
      } else if (item.action === 'update') {
        await updateVisitFn({
          // SAFETY: Enqueued offline visit update payload conforms to updateVisitFn input schema.
          data: item.payload as Parameters<typeof updateVisitFn>[0]['data'],
        });
      } else {
        throw new Error('Offline visit deletion is not supported');
      }

      await queryClient.invalidateQueries({ queryKey: visitQueryKeys.all });

      return;
    }

    case 'patient': {
      if (item.action === 'create') {
        await createPatientFn({
          // SAFETY: Enqueued offline patient create payload conforms to createPatientFn input schema.
          data: item.payload as Parameters<typeof createPatientFn>[0]['data'],
        });
      } else if (item.action === 'update') {
        await updatePatientFn({
          // SAFETY: Enqueued offline patient update payload conforms to updatePatientFn input schema.
          data: item.payload as Parameters<typeof updatePatientFn>[0]['data'],
        });
      } else {
        throw new Error('Offline patient deletion is not supported');
      }

      await queryClient.invalidateQueries({
        queryKey: patientQueryKeys.lists(),
      });

      return;
    }

    case 'queue': {
      if (item.action === 'create') {
        await enqueueClinicPatientFn({
          // SAFETY: Enqueued offline queue create payload conforms to enqueueClinicPatientFn input schema.
          data: item.payload as Parameters<
            typeof enqueueClinicPatientFn
          >[0]['data'],
        });
      } else if (item.action === 'update') {
        await updateQueueEntryStatusFn({
          // SAFETY: Enqueued offline queue update payload conforms to updateQueueEntryStatusFn input schema.
          data: item.payload as Parameters<
            typeof updateQueueEntryStatusFn
          >[0]['data'],
        });
      } else {
        throw new Error('Offline queue deletion is not supported');
      }

      await queryClient.invalidateQueries({ queryKey: ['queue'] });

      return;
    }

    case 'prescription': {
      if (item.action !== 'create') {
        throw new Error('Only prescription creation can be replayed offline');
      }

      await createPrescriptionRecordFn({
        // SAFETY: Enqueued offline prescription create payload conforms to createPrescriptionRecordFn input schema.
        data: item.payload as Parameters<
          typeof createPrescriptionRecordFn
        >[0]['data'],
      });
      await queryClient.invalidateQueries({
        queryKey: prescriptionQueryKeys.all,
      });

      return;
    }

    case 'vitals': {
      if (item.action !== 'create') {
        throw new Error('Only vitals creation can be replayed offline');
      }

      await addVisitMeasurementWithZScoreFn({
        // SAFETY: Enqueued offline vitals create payload conforms to addVisitMeasurementWithZScoreFn input schema.
        data: item.payload as Parameters<
          typeof addVisitMeasurementWithZScoreFn
        >[0]['data'],
      });
      await queryClient.invalidateQueries({ queryKey: ['growth'] });

      return;
    }

    default: {
      const unsupported: never = item.entityType;
      throw new Error(
        `Unsupported offline mutation type: ${String(unsupported)}`,
      );
    }
  }
}
