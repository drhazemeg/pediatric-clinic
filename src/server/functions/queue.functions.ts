// src/server/functions/queue.functions.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { and, db, eq, gte, lt } from '@/db';
import { queryCache } from '@/db/cache';
import { clinicQueue } from '@/db/schema';
import { createId } from '@/lib/id';

import { AppServerError, toAppServerError } from '../fn-errors';
import { clinicalStaffMiddleware } from '../fn-middleware';

const queueStatusSchema = z.enum([
  'WAITING',
  'IN_VITALS',
  'WITH_DOCTOR',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

const listQueueInputSchema = z.object({
  clinicId: z.string().min(1),
  dateIso: z.string().optional(),
});

const enqueuePatientInputSchema = z.object({
  clinicId: z.string().min(1),
  patientId: z.string().min(1),
  appointmentId: z.string().min(1).nullable().optional(),
  doctorId: z.string().min(1).nullable().optional(),
  priority: z.number().int().min(0).max(10).default(0),
  isWalkIn: z.boolean().default(false),
  chiefComplaint: z.string().trim().max(1000).nullable().optional(),
});

const updateQueueStatusInputSchema = z.object({
  id: z.string().min(1),
  status: queueStatusSchema,
  doctorId: z.string().min(1).nullable().optional(),
});

export const listClinicQueueFn = createServerFn({ method: 'GET' })
  .middleware([clinicalStaffMiddleware])
  .validator(listQueueInputSchema)
  .handler(async ({ data, context }) => {
    try {
      context.guard.assertClinicScope(data.clinicId);

      const queueMod = await import('@/db/queries/queue.queries').catch(
        () => null,
      );

      if (queueMod !== null) {
        return await queueMod.listClinicQueue(data);
      }

      const ref =
        data.dateIso !== undefined && data.dateIso !== ''
          ? new Date(data.dateIso)
          : new Date();

      const start = new Date(ref);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      return await db.query.clinicQueue.findMany({
        where: {
          clinicId: data.clinicId,
          createdAt: { gte: start, lt: end },
        },
        orderBy: (t, { desc: d, asc: a }) => [d(t.priority), a(t.queueNumber)],
        with: {
          patient: {
            columns: {
              id: true,
              mrn: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              parentPhone: true,
              allergies: true,
              weightKg: true,
            },
          },
          doctor: {
            columns: { id: true, name: true },
          },
        },
      });
    } catch (error) {
      return toAppServerError(error, 'Failed to load clinic queue');
    }
  });

export const enqueueClinicPatientFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(enqueuePatientInputSchema)
  .handler(async ({ data, context }) => {
    try {
      context.guard.assertClinicScope(data.clinicId);
      await context.guard.assertPatientAccess(data.patientId, {
        expectedClinicId: data.clinicId,
      });

      if (
        data.appointmentId !== undefined &&
        data.appointmentId !== null &&
        data.appointmentId !== ''
      ) {
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

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const todaysRows = await db
        .select({ queueNumber: clinicQueue.queueNumber })
        .from(clinicQueue)
        .where(
          and(
            eq(clinicQueue.clinicId, data.clinicId),
            gte(clinicQueue.createdAt, start),
            lt(clinicQueue.createdAt, end),
          ),
        );

      let maxQueueNumber = 0;

      for (const row of todaysRows) {
        if (row.queueNumber > maxQueueNumber) {
          maxQueueNumber = row.queueNumber;
        }
      }

      const nextQueueNumber = maxQueueNumber + 1;

      const [created] = await db
        .insert(clinicQueue)
        .values({
          id: createId('queue'),
          clinicId: data.clinicId,
          patientId: data.patientId,
          appointmentId: data.appointmentId ?? null,
          doctorId: data.doctorId ?? null,
          queueNumber: nextQueueNumber,
          status: 'WAITING',
          priority: data.priority,
          isWalkIn: data.isWalkIn,
          chiefComplaint: data.chiefComplaint ?? null,
          createdBy: context.user.id,
          updatedBy: context.user.id,
        })
        .returning();

      queryCache.invalidateTag(`queue:clinic:${data.clinicId}`);

      return created;
    } catch (error) {
      return toAppServerError(error, 'Failed to add patient to queue');
    }
  });

export const updateQueueEntryStatusFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(updateQueueStatusInputSchema)
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertQueueEntryAccess(data.id);
      const now = new Date();

      const updateValues: Partial<typeof clinicQueue.$inferInsert> = {
        status: data.status,
        updatedBy: context.user.id,
        updatedAt: now,
      };

      if (data.doctorId !== undefined) {
        updateValues.doctorId = data.doctorId;
      }

      if (data.status === 'IN_VITALS' || data.status === 'WITH_DOCTOR') {
        updateValues.calledAt = now;
      }

      if (data.status === 'WITH_DOCTOR') {
        updateValues.startedAt = now;
      }

      if (
        data.status === 'COMPLETED' ||
        data.status === 'CANCELLED' ||
        data.status === 'NO_SHOW'
      ) {
        updateValues.completedAt = now;
      }

      const updatedRows = await db
        .update(clinicQueue)
        .set(updateValues)
        .where(eq(clinicQueue.id, data.id))
        .returning();

      const updated = updatedRows.at(0);

      if (updated === undefined) {
        throw new AppServerError('NOT_FOUND', 'Queue entry not found', 404);
      }

      queryCache.invalidateTag(`queue:clinic:${updated.clinicId}`);

      return updated;
    } catch (error) {
      return toAppServerError(error, 'Failed to update queue status');
    }
  });

export const callNextClinicPatientFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(z.object({ clinicId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    try {
      context.guard.assertClinicScope(data.clinicId);

      const next = await db.query.clinicQueue.findFirst({
        where: {
          clinicId: data.clinicId,
          status: 'WAITING',
        },
        orderBy: (t, { desc: d, asc: a }) => [d(t.priority), a(t.queueNumber)],
      });

      if (next === undefined) {
        return null;
      }

      const now = new Date();

      const calledRows = await db
        .update(clinicQueue)
        .set({
          status: 'IN_VITALS',
          calledAt: now,
          updatedBy: context.user.id,
          updatedAt: now,
        })
        .where(
          and(
            eq(clinicQueue.id, next.id),
            eq(clinicQueue.clinicId, data.clinicId),
            eq(clinicQueue.status, 'WAITING'),
          ),
        )
        .returning();

      const called = calledRows.at(0);

      if (called === undefined) {
        throw new AppServerError(
          'CONFLICT',
          'The next queue entry was updated by another user',
          409,
        );
      }

      queryCache.invalidateTag(`queue:clinic:${data.clinicId}`);

      return called;
    } catch (error) {
      return toAppServerError(error, 'Failed to call the next patient');
    }
  });
