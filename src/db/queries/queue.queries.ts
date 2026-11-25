import type { QueueStatus } from '../validations';

import { and, eq, gte, sql } from 'drizzle-orm';

import { db } from '..';
import { clinicQueue } from '../schema/clinic';

export interface EnqueuePatientInput {
  clinicId: string;
  patientId: string;
  doctorId?: string | null;
  appointmentId?: string | null;
  priority?: number;
  isWalkIn?: boolean;
  chiefComplaint?: string | null;
  createdBy?: string | null;
}

/**
 * Get active queue entries for a clinic.
 * Includes patients currently WAITING, IN_VITALS, or WITH_DOCTOR,
 * or completed within the specified day.
 */
export async function getTodayQueue(
  clinicId: string,
  date = new Date(),
  limit = 100,
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await db.query.clinicQueue.findMany({
    where: {
      clinicId,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: (t, { asc, desc }) => [desc(t.priority), asc(t.queueNumber)],
    limit,
    with: {
      patient: {
        columns: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          sex: true,
          dateOfBirth: true,
          parentPhone: true,
          phone: true,
          allergies: true,
          weightKg: true,
        },
      },
      doctor: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      appointment: {
        columns: {
          id: true,
          scheduledAt: true,
          durationMinutes: true,
          reason: true,
        },
      },
    },
  });
}

export async function listClinicQueue(input: {
  clinicId: string;
  dateIso?: string;
}) {
  const date =
    input.dateIso !== undefined && input.dateIso !== ''
      ? new Date(input.dateIso)
      : new Date();

  return await getTodayQueue(input.clinicId, date);
}

/**
 * Enqueue a patient for today's clinic session.
 * Computes the next daily queue number atomically.
 */
export async function enqueuePatient(input: EnqueuePatientInput) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Get max queue number for today
  const maxRows = await db
    .select({
      maxNumber: sql<number>`COALESCE(MAX(${clinicQueue.queueNumber}), 0)::int`,
    })
    .from(clinicQueue)
    .where(
      and(
        eq(clinicQueue.clinicId, input.clinicId),
        gte(clinicQueue.createdAt, startOfDay),
      ),
    );

  const nextNumber = (maxRows.at(0)?.maxNumber ?? 0) + 1;

  const [entry] = await db
    .insert(clinicQueue)
    .values({
      clinicId: input.clinicId,
      patientId: input.patientId,
      doctorId: input.doctorId ?? null,
      appointmentId: input.appointmentId ?? null,
      queueNumber: nextNumber,
      status: 'WAITING',
      priority: input.priority ?? 0,
      isWalkIn: input.isWalkIn ?? false,
      chiefComplaint: input.chiefComplaint ?? null,
      createdBy: input.createdBy ?? null,
    })
    .returning();

  return entry;
}

/**
 * Transition a queue entry's state with timestamps.
 */
export async function updateQueueStatus(
  id: string,
  status: QueueStatus,
  updatedBy?: string | null,
) {
  const patch: Partial<typeof clinicQueue.$inferInsert> = {
    status,
    updatedAt: new Date(),
  };

  if (updatedBy !== undefined && updatedBy !== null && updatedBy !== '') {
    patch.updatedBy = updatedBy;
  }

  const now = new Date();

  if (status === 'IN_VITALS' || status === 'WITH_DOCTOR') {
    patch.calledAt = now;

    if (status === 'WITH_DOCTOR') {
      patch.startedAt = now;
    }
  } else if (
    status === 'COMPLETED' ||
    status === 'CANCELLED' ||
    status === 'NO_SHOW'
  ) {
    patch.completedAt = now;
  }

  const updatedRows = await db
    .update(clinicQueue)
    .set(patch)
    .where(eq(clinicQueue.id, id))
    .returning();

  return updatedRows.at(0) ?? null;
}

/**
 * Call the next waiting patient for a doctor.
 */
export async function callNextWaitingPatient(
  clinicId: string,
  doctorId: string,
) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const waiting = await db.query.clinicQueue.findFirst({
    where: {
      clinicId,
      status: 'WAITING',
      createdAt: { gte: startOfDay },
    },
    orderBy: (t, { asc, desc }) => [desc(t.priority), asc(t.queueNumber)],
  });

  if (waiting === undefined) {
    return null;
  }

  return await updateQueueStatus(waiting.id, 'WITH_DOCTOR', doctorId);
}
