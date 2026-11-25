// packages/db/src/queries/visit-composer.queries.ts
//
// Pure DB layer for the visit composer. No TanStack Start, no React,
// no queryOptions. Only Drizzle + your domain helpers.

import type { DbTx } from '..';
import type {
  AuthUser,
  SaveVisitInput,
  SaveVisitResult,
} from '@/lib/features/visits/composer.schema';

import { db, eq } from '..';
import {
  diagnoses,
  measurements,
  patients,
  prescriptions,
  visits,
} from '../schema';

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot reads
// ─────────────────────────────────────────────────────────────────────────────

/** Everything the composer's patient card and weight sparkline need. */
export async function fetchPatientSnapshot(patientId: string) {
  const patient = await db.query.patients.findFirst({
    where: { id: patientId },
    columns: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      sex: true,
      dateOfBirth: true,
      allergies: true,
    },
  });

  if (patient === undefined) {
    return null;
  }

  const lastVisits = await db.query.visits.findMany({
    where: { patientId },
    orderBy: { visitedAt: 'desc' },
    limit: 1,
    columns: { visitedAt: true },
  });

  const lastVisit = lastVisits.at(0);

  const weightSeries = await db.query.measurements.findMany({
    where: { patientId, indicator: 'weight-for-age' },
    orderBy: { measuredAt: 'asc' },
    columns: { value: true, measuredAt: true },
  });

  return {
    patient,
    lastVisitAt: lastVisit?.visitedAt ?? null,
    weightSeries: weightSeries.map((w) => ({
      value: w.value,
      at: w.measuredAt,
    })),
  };
}

/** Active prescriptions — used by the safety rail's interaction check. */
export async function fetchActiveMedications(patientId: string) {
  return await db.query.prescriptions.findMany({
    where: { patientId, status: 'active' },
    columns: { id: true, medicationName: true, dosage: true },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

const monthsBetween = (from: Date, to: Date): number =>
  (to.getTime() - from.getTime()) / MS_PER_MONTH;

const assertVisitAccess = async (
  tx: DbTx,
  input: Pick<SaveVisitInput, 'patientId' | 'clinicId'>,
  user: AuthUser,
): Promise<{ dob: string }> => {
  const patientRows = await tx
    .select({ dob: patients.dateOfBirth, clinicId: patients.clinicId })
    .from(patients)
    .where(eq(patients.id, input.patientId))
    .limit(1);

  const patient = patientRows.at(0);

  if (patient === undefined) {
    throw new Error(`Patient ${input.patientId} not found`);
  }

  if (patient.clinicId !== input.clinicId) {
    throw new Error(
      `Patient belongs to clinic ${patient.clinicId}, not ${input.clinicId}`,
    );
  }

  if (user.role !== 'admin' && user.clinicId !== input.clinicId) {
    throw new Error('Forbidden: cross-clinic access denied');
  }

  return { dob: patient.dob };
};

const upsertVisit = async (
  tx: DbTx,
  input: SaveVisitInput,
  ageMonths: number,
): Promise<string> => {
  const base = {
    clinicId: input.clinicId,
    doctorId: input.doctorId,
    visitedAt: input.visitedAt,
    ageMonths,
    chiefComplaint:
      input.chiefComplaint.trim() === '' ? null : input.chiefComplaint.trim(),
    symptoms: input.symptoms.join(', '),
    physicalExam:
      input.examFindings.trim() === '' ? null : input.examFindings.trim(),
    plan: input.plan.trim() === '' ? null : input.plan.trim(),
  };

  if (input.visitId !== undefined && input.visitId !== '') {
    const rows = await tx
      .update(visits)
      .set(base)
      .where(eq(visits.id, input.visitId))
      .returning({ id: visits.id });

    const row = rows.at(0);

    if (row === undefined) {
      throw new Error(`Visit ${input.visitId} not found`);
    }

    return row.id;
  }

  const [row] = await tx
    .insert(visits)
    .values({ ...base, patientId: input.patientId })
    .returning({ id: visits.id });

  return row.id;
};

const insertChildren = async (
  tx: DbTx,
  input: SaveVisitInput,
  visitId: string,
  prescriberId: string,
): Promise<void> => {
  if (input.measurements.length > 0) {
    await tx.insert(measurements).values(
      input.measurements.map((m) => ({
        visitId,
        patientId: input.patientId,
        measuredAt: input.visitedAt,
        indicator: m.indicator,
        value: m.value,
        lengthCmAtMeasurement:
          m.indicator === 'weight-for-length' ? (m.lengthCm ?? null) : null,
      })),
    );
  }

  if (input.diagnoses.length > 0) {
    await tx.insert(diagnoses).values(
      input.diagnoses.map((d) => ({
        visitId,
        icdCode: d.icdCode,
        description: d.description,
        type: d.type,
      })),
    );
  }

  if (input.prescriptions.length > 0) {
    await tx.insert(prescriptions).values(
      input.prescriptions.map((p) => ({
        visitId,
        patientId: input.patientId,
        prescribedById: prescriberId,
        medicationName: p.medicationName,
        dosage: p.dosage,
        frequency: p.frequency,
        durationDays: p.durationDays ?? null,
        instructions:
          p.instructions.trim() === '' ? null : p.instructions.trim(),
        prescribedAt: input.visitedAt,
      })),
    );
  }
};

const clearChildren = async (tx: DbTx, visitId: string): Promise<void> => {
  await tx.delete(measurements).where(eq(measurements.visitId, visitId));
  await tx.delete(diagnoses).where(eq(diagnoses.visitId, visitId));
  await tx.delete(prescriptions).where(eq(prescriptions.visitId, visitId));
};

export async function saveVisit(
  input: SaveVisitInput,
  user: AuthUser,
): Promise<SaveVisitResult> {
  return await db.transaction(async (tx) => {
    const { dob } = await assertVisitAccess(tx, input, user);
    const ageMonths = monthsBetween(new Date(dob), input.visitedAt);
    const visitId = await upsertVisit(tx, input, ageMonths);

    if (input.visitId !== undefined && input.visitId !== '') {
      await clearChildren(tx, visitId);
    }

    const prescriberId =
      input.doctorId === undefined ||
      input.doctorId === null ||
      input.doctorId === ''
        ? user.id
        : input.doctorId;

    await insertChildren(tx, input, visitId, prescriberId);

    return { visitId };
  });
}
