import type { NewVisit, Visit, VisitInput } from '../validations';
import type { VisitSearch } from '@/lib/features/visits/index';

import { and, eq } from 'drizzle-orm';

import { db } from '..';
import { visits } from '../schema';

export async function createVisit(input: VisitInput): Promise<Visit> {
  const years = input.ageYears ?? Math.floor(input.ageMonths / 12);

  const monthsRemainder =
    input.ageMonthsRemainder ?? Math.round(input.ageMonths - years * 12);

  const [row] = await db
    .insert(visits)
    .values({
      ...input,
      ageYears: years,
      ageMonthsRemainder: monthsRemainder,
    })
    .returning();

  return row;
}

export async function getVisitById(id: string): Promise<Visit | null> {
  const row = await db.query.visits.findFirst({
    where: { id },
  });

  return row ?? null;
}

export async function getVisitWithDetails(id: string) {
  return await db.query.visits.findFirst({
    where: { id },
    with: {
      patient: true,
      measurements: true,
      diagnoses: true,
      prescriptions: true,
      medicalNotes: true,
      doctor: true,
      appointment: true,
    },
  });
}

export async function listVisitsForPatient(patientId: string) {
  return await db.query.visits.findMany({
    where: { patientId },
    orderBy: { visitedAt: 'desc' },
    with: {
      measurements: true,
      diagnoses: true,
      prescriptions: true,
      doctor: { columns: { id: true, name: true } },
    },
  });
}

export async function listVisitsForClinic(
  clinicId: string,
  search?: Partial<VisitSearch>,
) {
  const page = search?.page ?? 1;
  const pageSize = search?.pageSize ?? 25;
  const offset = (page - 1) * pageSize;

  return await db.query.visits.findMany({
    where: { clinicId },
    orderBy: { visitedAt: 'desc' },
    limit: pageSize,
    offset,
    with: {
      patient: true,
      doctor: true,
      diagnoses: true,
      measurements: true,
    },
  });
}

export async function updateVisit(
  id: string,
  patch: Partial<NewVisit>,
): Promise<Visit | null> {
  const rows = await db
    .update(visits)
    .set(patch)
    .where(eq(visits.id, id))
    .returning();

  return rows.at(0) ?? null;
}

export async function deleteVisit(id: string): Promise<boolean> {
  await db.delete(visits).where(eq(visits.id, id));

  return true;
}

// Add to db/queries/visits.queries.ts
export async function listRecentVisitsForClinic(clinicId: string, limit = 50) {
  return await db.query.visits.findMany({
    where: { clinicId },
    orderBy: { visitedAt: 'desc' },
    limit,
    with: {
      patient: true,
      measurements: true,
      diagnoses: true,
      prescriptions: true,
      doctor: true,
    },
  });
}

export async function updateVisitStatus(
  id: string,
  patientId: string,
  status: Visit['status'],
): Promise<Visit | null> {
  const rows = await db
    .update(visits)
    .set({ status })
    .where(and(eq(visits.id, id), eq(visits.patientId, patientId)))
    .returning();

  return rows.at(0) ?? null;
}
