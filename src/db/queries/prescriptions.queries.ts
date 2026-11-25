import type { DbTx } from '..';

import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '..';
import {
  auditLog,
  idempotency,
  patients,
  prescriptions,
  user,
  visits,
} from '../schema';

const sqlCount = () => sql<number>`count(*)::int`;

const activePrescriptionDurationFilter = (table: typeof prescriptions) =>
  sql`(${table.prescribedAt} + make_interval(days => ${table.durationDays})) >= ${new Date()}`;

export interface SavePrescriptionParams {
  idempotencyKey: string | null;
  requestHash: string | null;
  actorId: string;
  prescriptionId?: string;
  patientId: string;
  visitId: string;
  medicationName: string;
  strength: number;
  unit: string;
  frequency: string;
  durationDays: number | null;
  instructions: string | null;
  prescribedById: string;
  baseVersion?: string;
}

export interface PersistedPrescription {
  id: string;
  patientId: string;
  visitId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number | null;
  instructions: string | null;
  prescribedById: string | null;
  prescribedAt: Date;
  status: 'active' | 'completed' | 'cancelled';
  updatedAt: Date;
}

export type IdempotencyLookup =
  | { kind: 'miss' }
  | { kind: 'hash-mismatch' }
  | { kind: 'corrupt'; reason: string }
  | { kind: 'hit'; prescriptionId: string };

export async function createPrescription(input: {
  visitId: string;
  patientId: string;
  prescribedById?: string | null;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays?: number | null;
  instructions?: string | null;
  prescribedAt?: Date;
}) {
  const [row] = await db.insert(prescriptions).values(input).returning();

  return row;
}

export async function createPrescriptions(
  rows: Array<Parameters<typeof createPrescription>[0]>,
) {
  if (rows.length === 0) {
    return [];
  }

  return await db.insert(prescriptions).values(rows).returning();
}

// --- Read ---

export async function getPrescriptionById(id: string) {
  return await db.query.prescriptions.findFirst({
    where: { id },
    with: {
      visit: true,
      patient: true,
      prescribedBy: { columns: { id: true, name: true } },
    },
  });
}

export async function listPrescriptionsForVisit(visitId: string) {
  return await db.query.prescriptions.findMany({
    where: { visitId },
    orderBy: { prescribedAt: 'asc' },
    with: {
      visit: { columns: { visitedAt: true, ageMonths: true } },
      prescribedBy: { columns: { id: true, name: true } },
    },
  });
}

/**
 * Full medication history for a patient — what the next prescriber needs to see.
 */
export async function listPrescriptionsForPatient(patientId: string) {
  return await db.query.prescriptions.findMany({
    where: { patientId },
    orderBy: { prescribedAt: 'desc' },
    with: {
      prescribedBy: { columns: { id: true, name: true } },
      visit: { columns: { visitedAt: true, ageMonths: true } },
    },
  });
}

/**
 * Active prescriptions (still within their duration window).
 */
export async function listActivePrescriptionsForPatient(patientId: string) {
  return await db.query.prescriptions.findMany({
    where: {
      patientId,
      status: 'active',
      OR: [
        { durationDays: { isNull: true } },
        {
          RAW: activePrescriptionDurationFilter,
        },
      ],
    },
    orderBy: { prescribedAt: 'desc' },
  });
}

/**
 * A doctor's prescribing history.
 */
export async function listPrescriptionsByPrescriber(
  userId: string,
  limit = 100,
) {
  return await db.query.prescriptions.findMany({
    where: { prescribedById: userId },
    orderBy: { prescribedAt: 'desc' },
    limit,
    with: {
      patient: { columns: { mrn: true, firstName: true, lastName: true } },
    },
  });
}

// --- Update / delete ---

export async function updatePrescription(
  id: string,
  patch: Partial<{
    medicationName: string;
    dosage: string;
    frequency: string;
    durationDays: number | null;
    instructions: string | null;
    status: 'active' | 'completed' | 'cancelled';
  }>,
) {
  const rows = await db
    .update(prescriptions)
    .set(patch)
    .where(eq(prescriptions.id, id))
    .returning();

  return rows.at(0);
}

export async function deletePrescription(id: string) {
  await db.delete(prescriptions).where(eq(prescriptions.id, id));
}

export async function getPatientForPrescription(
  patientId: string,
  clinicId: string,
) {
  return await db.query.patients.findFirst({
    where: { id: patientId, clinicId },
    columns: { id: true, weightKg: true, allergies: true },
  });
}

export async function getVisitForPrescription(
  visitId: string,
  patientId: string,
  clinicId: string,
) {
  return await db.query.visits.findFirst({
    where: { id: visitId, patientId, clinicId },
    columns: { id: true },
  });
}

// --- Transactional / idempotent operations ---

const idempotencyResultSchema = z.object({
  prescriptionId: z.string().min(1),
});

export async function lookupIdempotency(
  tx: DbTx,
  key: string,
  requestHash: string,
): Promise<IdempotencyLookup> {
  const previousRows = await tx
    .select()
    .from(idempotency)
    .where(eq(idempotency.key, key))
    .limit(1);

  const previous = previousRows.at(0);

  if (previous === undefined) {
    return { kind: 'miss' };
  }

  if (previous.requestHash !== requestHash) {
    return { kind: 'hash-mismatch' };
  }

  const parsedResult = idempotencyResultSchema.safeParse(previous.result);

  if (!parsedResult.success) {
    return { kind: 'corrupt', reason: 'Stored idempotency result is invalid.' };
  }

  return { kind: 'hit', prescriptionId: parsedResult.data.prescriptionId };
}

export async function insertPrescriptionWithAudit(
  tx: DbTx,
  input: {
    patientId: string;
    visitId: string;
    medicationName: string;
    strength: number;
    unit: string;
    frequency: string;
    durationDays: number | null;
    instructions: string | null;
    prescribedById: string;
  },
): Promise<PersistedPrescription> {
  const [row] = await tx
    .insert(prescriptions)
    .values({
      patientId: input.patientId,
      visitId: input.visitId,
      medicationName: input.medicationName,
      dosage: `${input.strength} ${input.unit}`,
      frequency: input.frequency,
      durationDays: input.durationDays,
      instructions: input.instructions,
      prescribedById: input.prescribedById,
      prescribedAt: new Date(),
      status: 'active',
    })
    .returning();

  await tx.insert(auditLog).values({
    actorId: input.prescribedById,
    action: 'create',
    entity: 'Prescription',
    entityId: row.id,
    metadata: {
      patientId: row.patientId,
      visitId: row.visitId,
      medicationName: row.medicationName,
    },
  });

  return row;
}

export async function updatePrescriptionWithAudit(
  tx: DbTx,
  input: {
    prescriptionId: string;
    patientId: string;
    visitId: string;
    actorId: string;
    medicationName: string;
    strength: number;
    unit: string;
    frequency: string;
    durationDays: number | null;
    instructions: string | null;
  },
): Promise<PersistedPrescription> {
  const currentRows = await tx
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, input.prescriptionId))
    .limit(1);

  const current = currentRows.at(0);

  if (current === undefined) {
    throw Object.assign(new Error('Prescription not found.'), { status: 404 });
  }

  if (
    current.patientId !== input.patientId ||
    current.visitId !== input.visitId
  ) {
    throw Object.assign(new Error('Forbidden.'), { status: 403 });
  }

  const rows = await tx
    .update(prescriptions)
    .set({
      medicationName: input.medicationName,
      dosage: `${input.strength} ${input.unit}`,
      frequency: input.frequency,
      durationDays: input.durationDays,
      instructions: input.instructions,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(prescriptions.id, input.prescriptionId),
        eq(prescriptions.patientId, input.patientId),
        eq(prescriptions.visitId, input.visitId),
      ),
    )
    .returning();

  const row = rows.at(0);

  if (row === undefined) {
    throw new Error('Failed to update prescription.');
  }

  await tx.insert(auditLog).values({
    actorId: input.actorId,
    action: 'update',
    entity: 'Prescription',
    entityId: row.id,
    metadata: {
      patientId: row.patientId,
      changes: {
        medicationName: {
          from: current.medicationName,
          to: row.medicationName,
        },
        dosage: { from: current.dosage, to: row.dosage },
        frequency: { from: current.frequency, to: row.frequency },
      },
    },
  });

  return row;
}

export async function storeIdempotencyResult(
  tx: DbTx,
  key: string,
  requestHash: string,
  prescriptionId: string,
) {
  await tx.insert(idempotency).values({
    id: crypto.randomUUID(),
    key,
    requestHash,
    result: { prescriptionId },
  });
}

export async function savePrescriptionTransactional(
  params: SavePrescriptionParams,
): Promise<PersistedPrescription> {
  const hasIdempotency =
    params.idempotencyKey !== null &&
    params.idempotencyKey !== '' &&
    params.requestHash !== null &&
    params.requestHash !== '';

  return await db.transaction(async (tx) => {
    // Idempotent replay check
    if (
      hasIdempotency &&
      params.idempotencyKey !== null &&
      params.requestHash !== null
    ) {
      const found = await lookupIdempotency(
        tx,
        params.idempotencyKey,
        params.requestHash,
      );

      if (found.kind === 'hash-mismatch') {
        throw Object.assign(
          new Error(
            'Conflict (409): Idempotency key was reused with a different request.',
          ),
          { status: 409 },
        );
      }

      if (found.kind === 'corrupt') {
        throw new Error(found.reason);
      }

      if (found.kind === 'hit') {
        const rows = await tx
          .select()
          .from(prescriptions)
          .where(eq(prescriptions.id, found.prescriptionId))
          .limit(1);

        const row = rows.at(0);

        if (row === undefined) {
          throw new Error('The previously saved prescription is missing.');
        }

        return row;
      }
    }

    // Create path
    if (params.prescriptionId === undefined || params.prescriptionId === '') {
      const row = await insertPrescriptionWithAudit(tx, params);

      if (
        hasIdempotency &&
        params.idempotencyKey !== null &&
        params.requestHash !== null
      ) {
        await storeIdempotencyResult(
          tx,
          params.idempotencyKey,
          params.requestHash,
          row.id,
        );
      }

      return row;
    }

    // Update path — optimistic concurrency version check
    if (params.baseVersion !== undefined && params.baseVersion !== '') {
      const currentRows = await tx
        .select({ updatedAt: prescriptions.updatedAt })
        .from(prescriptions)
        .where(eq(prescriptions.id, params.prescriptionId))
        .limit(1);

      const current = currentRows.at(0);

      if (
        current !== undefined &&
        current.updatedAt.toISOString() !== params.baseVersion
      ) {
        throw Object.assign(new Error('Version conflict (409).'), {
          status: 409,
          serverSnapshot: current,
        });
      }
    }

    const row = await updatePrescriptionWithAudit(tx, {
      ...params,
      actorId: params.actorId,
      prescriptionId: params.prescriptionId,
    });

    if (
      hasIdempotency &&
      params.idempotencyKey !== null &&
      params.requestHash !== null
    ) {
      await storeIdempotencyResult(
        tx,
        params.idempotencyKey,
        params.requestHash,
        row.id,
      );
    }

    return row;
  });
}

// --- Aggregates & formulary lookups ---

/**
 * Most-prescribed medications in a clinic.
 */
export async function topMedicationsForClinic(clinicId: string, limit = 20) {
  return await db
    .select({
      medicationName: prescriptions.medicationName,
      count: sqlCount(),
    })
    .from(prescriptions)
    .innerJoin(visits, eq(visits.id, prescriptions.visitId))
    .where(eq(visits.clinicId, clinicId))
    .groupBy(prescriptions.medicationName)
    .orderBy(desc(sqlCount()))
    .limit(limit);
}

export async function countPrescriptionsForPatient(patientId: string) {
  const [row] = await db
    .select({ count: sqlCount() })
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId));

  return row.count;
}

/** Find a formulary drug by its generic or brand name (PostgreSQL). */
export async function findFormularyDrug(name: string) {
  const normalizedName = name.trim();

  if (normalizedName === '') {
    return null;
  }

  const result = await db.execute(sql`
    SELECT *
    FROM formulary_drugs
    WHERE lower(medication_name) = lower(${normalizedName})
       OR lower(brand_name) = lower(${normalizedName})
    LIMIT 1
  `);

  const rows = Array.isArray(result) ? result.at(0)?.rows : result.rows;

  return rows?.at(0) ?? null;
}

// --- Register & detail queries ---

export interface PrescriptionRegisterRow {
  id: string;
  medicationName: string;
  brandName: string | null;
  dosage: string;
  frequency: string;
  durationDays: number | null;
  status: 'active' | 'completed' | 'cancelled';
  prescribedAt: Date;
  prescriber: { id: string; name: string } | null;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
  } | null;
  flagsInteraction: boolean;
}

export async function listPrescriptionRegister(
  clinicId: string,
  search: {
    q?: string;
    medication?: string;
    prescriberId?: string;
    status: 'all' | 'active' | 'completed' | 'cancelled';
    from?: string;
    to?: string;
    page: number;
    size: number;
  },
): Promise<{ rows: Array<PrescriptionRegisterRow>; total: number }> {
  const conditions = [eq(visits.clinicId, clinicId)];

  if (search.status !== 'all') {
    conditions.push(eq(prescriptions.status, search.status));
  }

  if (search.prescriberId !== undefined && search.prescriberId !== '') {
    conditions.push(eq(prescriptions.prescribedById, search.prescriberId));
  }

  if (search.medication !== undefined && search.medication !== '') {
    conditions.push(
      ilike(prescriptions.medicationName, `%${search.medication}%`),
    );
  }

  if (search.from !== undefined && search.from !== '') {
    conditions.push(
      gte(prescriptions.prescribedAt, new Date(`${search.from}T00:00:00Z`)),
    );
  }

  if (search.to !== undefined && search.to !== '') {
    conditions.push(
      lte(prescriptions.prescribedAt, new Date(`${search.to}T23:59:59Z`)),
    );
  }

  const where = and(...conditions);
  const offset = (search.page - 1) * search.size;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: prescriptions.id,
        medicationName: prescriptions.medicationName,
        dosage: prescriptions.dosage,
        frequency: prescriptions.frequency,
        durationDays: prescriptions.durationDays,
        status: prescriptions.status,
        prescribedAt: prescriptions.prescribedAt,
        prescriber: { id: user.id, name: user.name },
        patient: {
          id: patients.id,
          mrn: patients.mrn,
          firstName: patients.firstName,
          lastName: patients.lastName,
        },
      })
      .from(prescriptions)
      .innerJoin(visits, eq(visits.id, prescriptions.visitId))
      .innerJoin(patients, eq(patients.id, prescriptions.patientId))
      .leftJoin(user, eq(user.id, prescriptions.prescribedById))
      .where(where)
      .orderBy(desc(prescriptions.prescribedAt))
      .limit(search.size)
      .offset(offset),
    db
      .select({ count: sqlCount() })
      .from(prescriptions)
      .innerJoin(visits, eq(visits.id, prescriptions.visitId))
      .where(where),
  ]);

  return {
    total: countRows.at(0)?.count ?? 0,
    rows: rows.map((r) => ({
      ...r,
      status: r.status,
      brandName: null,
      flagsInteraction: false,
    })),
  };
}

export async function renewPrescription(
  id: string,
  prescribedById?: string | null,
) {
  const originalRows = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, id))
    .limit(1);

  const original = originalRows.at(0);

  if (original === undefined) {
    throw new Error('Prescription not found');
  }

  const [row] = await db
    .insert(prescriptions)
    .values({
      visitId: original.visitId,
      patientId: original.patientId,
      prescribedById: prescribedById ?? original.prescribedById,
      medicationName: original.medicationName,
      dosage: original.dosage,
      frequency: original.frequency,
      durationDays: original.durationDays,
      instructions: original.instructions,
      prescribedAt: new Date(),
    })
    .returning();

  return row;
}

/**
 * Fetch a single prescription with everything the detail view needs:
 * patient (with age-worthy fields), visit summary, prescriber, and the
 * previous 3 prescriptions for the same patient (for the mini-timeline).
 */
export async function getPrescriptionWithContext(id: string) {
  const prescription = await db.query.prescriptions.findFirst({
    where: { id },
    with: {
      patient: {
        columns: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          sex: true,
          dateOfBirth: true,
          allergies: true,
          weightKg: true,
        },
      },
      visit: {
        columns: { id: true, visitedAt: true, ageMonths: true },
      },
      prescribedBy: { columns: { id: true, name: true, role: true } },
    },
  });

  if (prescription === undefined) {
    return null;
  }

  const previous = await db.query.prescriptions.findMany({
    where: {
      patientId: prescription.patientId,
      id: { ne: id },
    },
    orderBy: { prescribedAt: 'desc' },
    limit: 3,
    columns: {
      id: true,
      medicationName: true,
      dosage: true,
      frequency: true,
      prescribedAt: true,
      status: true,
    },
  });

  return { ...prescription, previousPrescriptions: previous };
}

/**
 * Active prescriptions for a patient, excluding one id — the safety rail
 * uses this to detect duplicate therapy.
 */
interface ActivePrescriptionsWhere {
  patientId: string;
  status: 'active';
  id?: { ne: string };
}

export async function listOtherActivePrescriptions(
  patientId: string,
  excludeId?: string,
) {
  const where: ActivePrescriptionsWhere = {
    patientId,
    status: 'active',
  };

  if (excludeId !== undefined && excludeId !== '') {
    where.id = { ne: excludeId };
  }

  return await db.query.prescriptions.findMany({
    where,
    columns: {
      id: true,
      medicationName: true,
      dosage: true,
      frequency: true,
    },
    orderBy: { prescribedAt: 'desc' },
  });
}
