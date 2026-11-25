import type { NewClinic } from '../schema/types';

import { eq, sql } from 'drizzle-orm';

import { createId } from '#/lib/id.ts';

import { db } from '..';
import { clinics } from '../schema';

// --- Create ---

export async function createClinic(input: NewClinic) {
  const [row] = await db
    .insert(clinics)
    .values({
      ...input,
      id: createId('clinic'),
    })
    .returning();

  return row;
}

// --- Read ---

export async function getClinicById(id: string) {
  return await db.query.clinics.findFirst({
    where: { id },
  });
}

export async function listClinics() {
  return await db.query.clinics.findMany({
    orderBy: (t, { asc }) => [asc(t.name)],
  });
}

/**
 * Clinic with counts — for admin dashboards.
 */
export async function getClinicWithStats(clinicId: string) {
  return await db.query.clinics.findFirst({
    where: { id: clinicId },
    with: {
      patients: { columns: { id: true } },
      users: { columns: { id: true, name: true, role: true } },
      appointments: {
        columns: { id: true },
        where: {
          scheduledAt: { gte: new Date() },
        },
      },
    },
  });
}

/**
 * Clinic with full roster (use sparingly — unbounded).
 */
export async function getClinicWithRoster(clinicId: string) {
  return await db.query.clinics.findFirst({
    where: { id: clinicId },
    with: {
      users: {
        columns: { id: true, name: true, role: true, email: true },
      },
      patients: {
        columns: { id: true, mrn: true, firstName: true, lastName: true },
        orderBy: (t, { asc }) => [asc(t.lastName), asc(t.firstName)],
      },
    },
  });
}

// --- Update / delete ---

export async function updateClinic(
  id: string,
  patch: Partial<Omit<typeof clinics.$inferInsert, 'id'>>,
) {
  const rows = await db
    .update(clinics)
    .set(patch)
    .where(eq(clinics.id, id))
    .returning();

  return rows.at(0);
}

export async function deleteClinic(id: string) {
  await db.delete(clinics).where(eq(clinics.id, id));
}

// --- Aggregates ---

export async function countClinics() {
  const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(clinics);

  return row.count;
}
