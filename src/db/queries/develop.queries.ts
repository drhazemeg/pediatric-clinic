// src/features/development/queries.ts

import type {
  PatientDevelopmentSnapshot,
  PatientMilestone,
} from '@/lib/features/development/dev-types';

import { eq } from 'drizzle-orm';

import { DEVELOPMENTAL_MILESTONES } from '@/lib/features/development/dev-types';

import { db } from '..';
import { milestones } from '../schema';

const CHECKUP_BRACKETS = [2, 4, 6, 9, 12, 18, 24, 36, 60] as const;

const isoToday = (): string => new Date().toISOString().slice(0, 10);

const decimalMonthsBetween = (dobIso: string, at: Date): number => {
  const dob = new Date(`${dobIso}T00:00:00Z`);

  return (at.getTime() - dob.getTime()) / (86_400_000 * 30.4375);
};

interface CorrectedAgeResult {
  ageMonths: number;
  correctedAgeMonths: number;
  isPreterm: boolean;
  weeksPremature: number;
}

const computeCorrectedAge = (
  dobIso: string,
  gaWeeks: number | null,
  at: Date,
): CorrectedAgeResult => {
  const ageMonths = decimalMonthsBetween(dobIso, at);
  const ga = gaWeeks ?? 40;
  const isPreterm = ga < 37;
  const weeksPremature = isPreterm ? 40 - ga : 0;

  const correctedAgeMonths = isPreterm
    ? Math.max(0, ageMonths - (weeksPremature * 7) / 30.4375)
    : ageMonths;

  return {
    ageMonths,
    correctedAgeMonths,
    isPreterm,
    weeksPremature,
  };
};

const pickNextCheckup = (correctedAgeMonths: number): number => {
  for (const bracket of CHECKUP_BRACKETS) {
    if (correctedAgeMonths < bracket - 0.5) {
      return bracket;
    }
  }

  return CHECKUP_BRACKETS.at(-1) ?? 0;
};

type MilestoneUpdatePayload = Pick<
  typeof milestones.$inferInsert,
  'isAchieved' | 'achievedDate' | 'notes'
> &
  Partial<Pick<typeof milestones.$inferInsert, 'updatedBy'>>;

/**
 * Merge the static milestone catalog with the patient's own records.
 * Unrecorded milestones default to "not achieved".
 */
export async function getPatientDevelopmentSnapshot(
  patientId: string,
  now: Date = new Date(),
): Promise<PatientDevelopmentSnapshot | null> {
  const patient = await db.query.patients.findFirst({
    where: { id: patientId },
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      sex: true,
      dateOfBirth: true,
      gestationalAgeWeeks: true,
    },
  });

  if (patient === undefined) {
    return null;
  }

  const recorded = await db.query.milestones.findMany({
    where: { patientId: patient.id },
    columns: {
      id: true,
      milestoneId: true,
      isAchieved: true,
      achievedDate: true,
      notes: true,
    },
  });

  const recordByCatalogId = new Map(
    recorded.map((r) => [r.milestoneId, r] as const),
  );

  const milestonesMerged: Array<PatientMilestone> =
    DEVELOPMENTAL_MILESTONES.map((m) => {
      const rec = recordByCatalogId.get(m.id);

      return {
        ...m,
        recordId: rec?.id ?? null,
        isAchieved: rec?.isAchieved ?? false,
        achievedDate: rec?.achievedDate ?? null,
        notes: rec?.notes ?? null,
      };
    });

  const ages = computeCorrectedAge(
    patient.dateOfBirth,
    patient.gestationalAgeWeeks,
    now,
  );

  return {
    patient,
    ageMonths: ages.ageMonths,
    correctedAgeMonths: ages.correctedAgeMonths,
    isPreterm: ages.isPreterm,
    weeksPremature: ages.weeksPremature,
    nextCheckupMonths: pickNextCheckup(ages.correctedAgeMonths),
    milestones: milestonesMerged,
  };
}

/**
 * Insert or update a single milestone record for a patient.
 * `achievedDate` is stored as `YYYY-MM-DD` (schema uses string).
 */
export async function setPatientMilestone(input: {
  patientId: string;
  milestoneId: string;
  isAchieved: boolean;
  achievedDate?: string | null;
  notes?: string | null;
  actorId?: string;
}) {
  const existing = await db.query.milestones.findFirst({
    where: {
      patientId: input.patientId,
      milestoneId: input.milestoneId,
    },
    columns: { id: true },
  });

  const value = {
    isAchieved: input.isAchieved,
    achievedDate: input.isAchieved ? (input.achievedDate ?? isoToday()) : null,
    notes: input.notes ?? null,
  };

  if (existing !== undefined) {
    const updatePayload: MilestoneUpdatePayload = {
      ...value,
    };

    if (input.actorId !== undefined && input.actorId !== '') {
      updatePayload.updatedBy = input.actorId;
    }

    const [row] = await db
      .update(milestones)
      .set(updatePayload)
      .where(eq(milestones.id, existing.id))
      .returning();

    return row;
  }

  const insertPayload: typeof milestones.$inferInsert = {
    patientId: input.patientId,
    milestoneId: input.milestoneId,
    ...value,
  };

  if (input.actorId !== undefined && input.actorId !== '') {
    insertPayload.createdBy = input.actorId;
    insertPayload.updatedBy = input.actorId;
  }

  const [row] = await db.insert(milestones).values(insertPayload).returning();

  return row;
}

/** Marks multiple milestone records achieved in one query. */
export async function bulkSetPatientMilestones(
  patientId: string,
  items: ReadonlyArray<{
    milestoneId: string;
    isAchieved: boolean;
    achievedDate?: string | null;
  }>,
  actorId?: string,
) {
  if (items.length === 0) {
    return [];
  }

  const ids = items.map((i) => i.milestoneId);

  const existingRows = await db.query.milestones.findMany({
    where: { patientId, milestoneId: { in: ids } },
    columns: { id: true, milestoneId: true },
  });

  const existingByCatalog = new Map(
    existingRows.map((r) => [r.milestoneId, r.id] as const),
  );

  const today = isoToday();
  const hasActor = actorId !== undefined && actorId !== '';

  const toInsert: Array<typeof milestones.$inferInsert> = [];
  const toUpdate: Array<(typeof items)[number]> = [];

  for (const i of items) {
    if (existingByCatalog.has(i.milestoneId)) {
      toUpdate.push(i);
    } else {
      const entry: typeof milestones.$inferInsert = {
        patientId,
        milestoneId: i.milestoneId,
        isAchieved: i.isAchieved,
        achievedDate: i.isAchieved ? (i.achievedDate ?? today) : null,
      };

      if (hasActor) {
        entry.createdBy = actorId;
        entry.updatedBy = actorId;
      }

      toInsert.push(entry);
    }
  }

  if (toInsert.length > 0) {
    await db.insert(milestones).values(toInsert);
  }

  await Promise.all(
    toUpdate.map(async (u) => {
      const id = existingByCatalog.get(u.milestoneId);

      if (id === undefined || id === '') {
        return;
      }

      const updateValues: Partial<typeof milestones.$inferInsert> & {
        updatedBy?: string;
      } = {
        isAchieved: u.isAchieved,
        achievedDate: u.isAchieved ? (u.achievedDate ?? today) : null,
      };

      if (hasActor) {
        updateValues.updatedBy = actorId;
      }

      await db
        .update(milestones)
        .set(updateValues)
        .where(eq(milestones.id, id));
    }),
  );

  return [...toInsert, ...toUpdate];
}
