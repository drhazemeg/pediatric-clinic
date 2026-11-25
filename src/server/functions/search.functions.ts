// src/server/functions/search.functions.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { toAppServerError } from '../fn-errors';
import { clinicalStaffMiddleware } from '../fn-middleware';

const globalClinicSearchSchema = z.object({
  clinicId: z.string().min(1),
  q: z.string().trim().min(1).max(120),
});

export const globalClinicSearchFn = createServerFn({ method: 'GET' })
  .middleware([clinicalStaffMiddleware])
  .validator(globalClinicSearchSchema)
  .handler(async ({ data, context }) => {
    try {
      context.guard.assertClinicScope(data.clinicId);

      const searchModule = await import('@/db/queries/search.queries').catch(
        () => null,
      );

      if (searchModule !== null) {
        return await searchModule.searchClinicRecords(data);
      }

      const [{ searchPatients }, { searchDiagnosesByClinic }] =
        await Promise.all([
          import('@/db/queries/patients.queries'),
          import('@/db/queries/diagnosis.queries'),
        ]);

      const [matchedPatients, matchedDiagnoses] = await Promise.all([
        searchPatients(data.clinicId, data.q),
        searchDiagnosesByClinic(data.clinicId, data.q),
      ]);

      return {
        patients: matchedPatients,
        diagnoses: matchedDiagnoses,
      };
    } catch (error) {
      return toAppServerError(error, 'Failed to search clinic records');
    }
  });
