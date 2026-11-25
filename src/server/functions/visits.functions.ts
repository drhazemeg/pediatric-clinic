// src/server/functions/visits.functions.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { db, eq } from '@/db';
import { queryCache } from '@/db/cache';
import { visits } from '@/db/schema';
import { createId } from '@/lib/id';

import { AppServerError, toAppServerError } from '../fn-errors';
import {
  clinicalStaffMiddleware,
  patientAccessMiddleware,
  providerOrAdminMiddleware,
} from '../fn-middleware';

const visitStatusSchema = z.enum(['scheduled', 'completed', 'cancelled']);

const createVisitInputSchema = z.object({
  patientId: z.string().min(1),
  clinicId: z.string().min(1),
  appointmentId: z.string().min(1).nullable().optional(),
  doctorId: z.string().min(1).nullable().optional(),
  visitedAt: z.coerce.date().default(() => new Date()),
  status: visitStatusSchema.default('completed'),
  ageMonths: z.number().min(0),
  ageYears: z.number().int().min(0).nullable().optional(),
  ageMonthsRemainder: z.number().int().min(0).max(11).nullable().optional(),
  chiefComplaint: z.string().trim().max(1000).nullable().optional(),
  diagnosis: z.string().trim().max(1000).nullable().optional(),
  symptoms: z.string().trim().max(2000).nullable().optional(),
  physicalExam: z.string().trim().max(4000).nullable().optional(),
  plan: z.string().trim().max(4000).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

const updateVisitInputSchema = z.object({
  id: z.string().min(1),
  patch: z.object({
    status: visitStatusSchema.optional(),
    chiefComplaint: z.string().trim().max(1000).nullable().optional(),
    diagnosis: z.string().trim().max(1000).nullable().optional(),
    symptoms: z.string().trim().max(2000).nullable().optional(),
    physicalExam: z.string().trim().max(4000).nullable().optional(),
    plan: z.string().trim().max(4000).nullable().optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
  }),
});

export const listPatientVisitsFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(z.object({ patientId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertPatientAccess(data.patientId);

      const visitsModule = await import('@/db/queries/visits.queries').catch(
        () => null,
      );

      if (visitsModule !== null) {
        return await visitsModule.listVisitsForPatient(data.patientId);
      }

      return await db.query.visits.findMany({
        where: { patientId: data.patientId },
        orderBy: (t, { desc: d }) => [d(t.visitedAt)],
        with: {
          doctor: { columns: { id: true, name: true } },
          diagnoses: true,
          measurements: true,
          prescriptions: true,
        },
      });
    } catch (error) {
      return toAppServerError(error, 'Failed to load patient visits');
    }
  });

export const getVisitFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertVisitAccess(data.id);

      const visitsModule = await import('@/db/queries/visits.queries').catch(
        () => null,
      );

      const visit =
        visitsModule === null
          ? await db.query.visits.findFirst({
              where: { id: data.id },
              with: {
                patient: true,
                clinic: true,
                doctor: { columns: { id: true, name: true, role: true } },
                diagnoses: true,
                measurements: true,
                prescriptions: true,
              },
            })
          : await visitsModule.getVisitWithDetails(data.id);

      if (!visit) {
        throw new AppServerError('NOT_FOUND', 'Visit not found', 404);
      }

      return visit;
    } catch (error) {
      return toAppServerError(error, 'Failed to load visit details');
    }
  });

export const createVisitFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(createVisitInputSchema)
  .handler(async ({ data, context }) => {
    try {
      context.guard.assertClinicScope(data.clinicId);
      await context.guard.assertPatientAccess(data.patientId, {
        expectedClinicId: data.clinicId,
      });

      if (data.appointmentId !== undefined && data.appointmentId !== null) {
        const appt = await context.guard.assertAppointmentAccess(
          data.appointmentId,
        );

        if (
          appt.clinicId !== data.clinicId ||
          appt.patientId !== data.patientId
        ) {
          throw new AppServerError(
            'FORBIDDEN',
            'Appointment does not match clinic or patient',
            403,
          );
        }
      }

      const [created] = await db
        .insert(visits)
        .values({
          ...data,
          id: createId('encounter'),
          appointmentId: data.appointmentId ?? null,
          doctorId: data.doctorId ?? context.user.id,
        })
        .returning();

      queryCache.invalidateTag(`visits:patient:${data.patientId}`);
      queryCache.invalidateTag(`visits:clinic:${data.clinicId}`);

      return created;
    } catch (error) {
      return toAppServerError(error, 'Failed to create visit');
    }
  });

export const updateVisitFn = createServerFn({ method: 'POST' })
  .middleware([providerOrAdminMiddleware])
  .validator(updateVisitInputSchema)
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertVisitAccess(data.id);

      const updatedRows = await db
        .update(visits)
        .set({
          ...data.patch,
          updatedAt: new Date(),
        })
        .where(eq(visits.id, data.id))
        .returning();

      const updated = updatedRows.at(0);

      if (updated === undefined) {
        throw new AppServerError('NOT_FOUND', 'Visit not found', 404);
      }

      queryCache.invalidateTag(`visits:patient:${updated.patientId}`);
      queryCache.invalidateTag(`visits:clinic:${updated.clinicId}`);

      return updated;
    } catch (error) {
      return toAppServerError(error, 'Failed to update visit');
    }
  });
