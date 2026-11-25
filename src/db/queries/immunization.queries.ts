import type { Transaction } from '..';
import type {
  Immunization,
  ImmunizationCoverage,
  ImmunizationStatus,
  MatrixResult,
  MatrixRow,
  MatrixVaccine,
  NewImmunization,
  PatientImmunizationRecord,
} from '../schema/types';
import type {
  ImmunizationInput,
  UpdateImmunizationInput,
} from '@/lib/features/immunizations';

import { createId } from '#/lib/id.ts';
import {
  ROUTINE_CHILDHOOD_SCHEDULE,
  immunizationInputSchema,
  updateImmunizationInputSchema,
} from '@/lib/features/immunizations';

import { and, db, eq, inArray, isNull } from '..';
import { auditLog, immunizations, patients } from '../schema';

type ImmunizationUpdate = Omit<UpdateImmunizationInput, 'createdBy'>;

const DAY_MS = 24 * 60 * 60 * 1000;

type AgeBracket = '0-6' | '6-12' | '12-24' | '>24';

const assertAdministrationDate = (
  status: ImmunizationStatus | undefined,
  administeredDate: Date | null | undefined,
): void => {
  if (
    status === 'administered' &&
    (administeredDate === undefined || administeredDate === null)
  ) {
    throw new Error(
      'An administration date is required for an administered dose',
    );
  }

  if (
    status !== undefined &&
    status !== 'administered' &&
    administeredDate !== undefined &&
    administeredDate !== null
  ) {
    throw new Error(
      'Only an administered dose can have an administration date',
    );
  }
};

const writeAudit = (
  tx: Transaction,
  input: {
    actorId: string | null;
    action: 'create' | 'update';
    entityId: string;
    status: ImmunizationStatus;
  },
) =>
  tx.insert(auditLog).values({
    actorId: input.actorId,
    action: input.action,
    entity: 'immunization',
    entityId: input.entityId,
    metadata: { status: input.status },
    createdAt: new Date(),
  });

const parseDateOnly = (value: string): Date =>
  new Date(`${value}T00:00:00.000Z`);

const formatDateOnly = (value: Date): string =>
  value.toISOString().slice(0, 10);

const addCalendarMonths = (dateOnly: string, months: number): string => {
  const source = parseDateOnly(dateOnly);
  const targetMonth = source.getUTCMonth() + months;
  const targetYear = source.getUTCFullYear() + Math.floor(targetMonth / 12);
  const monthOfYear = ((targetMonth % 12) + 12) % 12;

  const lastDay = new Date(
    Date.UTC(targetYear, monthOfYear + 1, 0),
  ).getUTCDate();

  return formatDateOnly(
    new Date(
      Date.UTC(targetYear, monthOfYear, Math.min(source.getUTCDate(), lastDay)),
    ),
  );
};

const compareDateOnly = (left: string, right: string): number =>
  left.localeCompare(right);

const latestImmunizations = <
  T extends {
    patientId: string;
    vaccineKey: string;
    doseNumber: number | null;
    status: ImmunizationStatus;
    createdAt: Date;
    updatedAt: Date;
    id: string;
  },
>(
  records: Array<T>,
): Map<string, T> => {
  const sorted = records.toSorted(
    (left, right) =>
      right.updatedAt.getTime() - left.updatedAt.getTime() ||
      right.createdAt.getTime() - left.createdAt.getTime() ||
      right.id.localeCompare(left.id),
  );

  const latest = new Map<string, T>();

  for (const record of sorted) {
    if (record.doseNumber === null) {
      continue;
    }

    const key = `${record.patientId}:${record.vaccineKey}:${record.doseNumber}`;

    if (!latest.has(key)) {
      latest.set(key, record);
    }
  }

  return latest;
};

const statusForScheduleItem = (
  record: Immunization | undefined,
  targetDate: string,
  today: string,
): PatientImmunizationRecord['status'] => {
  if (record === undefined) {
    const relativeToToday = compareDateOnly(targetDate, today);

    if (relativeToToday < 0) {
      return 'overdue';
    }

    if (relativeToToday > 0) {
      return 'planned';
    }

    return 'due';
  }

  if (record.status === 'administered') {
    return 'administered';
  }

  if (record.status === 'planned' || record.status === 'due') {
    const relativeToToday = compareDateOnly(targetDate, today);

    if (relativeToToday < 0) {
      return 'overdue';
    }

    if (record.status === 'due' || relativeToToday === 0) {
      return 'due';
    }

    return 'planned';
  }

  return record.status;
};

const matchesAgeBracket = (
  dateOfBirth: string,
  bracket: AgeBracket | undefined,
  now: Date,
): boolean => {
  if (bracket === undefined) {
    return true;
  }

  const birthDate = parseDateOnly(dateOfBirth);
  const today = parseDateOnly(formatDateOnly(now));

  let ageMonths =
    (today.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 +
    today.getUTCMonth() -
    birthDate.getUTCMonth();

  if (today.getUTCDate() < birthDate.getUTCDate()) {
    ageMonths -= 1;
  }

  switch (bracket) {
    case '0-6': {
      return ageMonths >= 0 && ageMonths < 6;
    }

    case '6-12': {
      return ageMonths >= 6 && ageMonths < 12;
    }

    case '12-24': {
      return ageMonths >= 12 && ageMonths < 24;
    }

    case '>24': {
      return ageMonths >= 24;
    }

    default: {
      const _exhaustive: never = bracket;

      return Boolean(_exhaustive);
    }
  }
};

const statusForMatrix = (
  status: ImmunizationStatus | undefined,
  targetDate: string,
  today: string,
): MatrixRow['cells'][string] => {
  if (status === 'administered') {
    return 'administered';
  }

  if (
    status === 'deferred' ||
    status === 'refused' ||
    status === 'contraindicated'
  ) {
    return status;
  }

  if (status === 'missed') {
    return 'missed';
  }

  const relativeToToday = compareDateOnly(targetDate, today);

  if (relativeToToday < 0) {
    return 'overdue';
  }

  if (status === 'planned' && relativeToToday > 0) {
    return 'planned';
  }

  return 'due';
};

export async function recordImmunization(
  input: ImmunizationInput | NewImmunization,
): Promise<Immunization> {
  const parsed = immunizationInputSchema.parse(input);
  assertAdministrationDate(parsed.status, parsed.administeredDate);

  return await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(immunizations)
      .values({
        id: createId('immunization'),
        ...parsed,
        administeredDate:
          parsed.status === 'administered' ? parsed.administeredDate : null,
      })
      .returning();

    await writeAudit(tx, {
      actorId: parsed.createdBy ?? parsed.administeredById ?? null,
      action: 'create',
      entityId: row.id,
      status: row.status,
    });

    return row;
  });
}

export async function updateImmunization(
  id: string,
  expectedVersion: number,
  patch: ImmunizationUpdate,
): Promise<Immunization | null> {
  const parsedPatch = updateImmunizationInputSchema.parse(patch);

  return await db.transaction(async (tx) => {
    const currentRows = await tx
      .select()
      .from(immunizations)
      .where(eq(immunizations.id, id))
      .limit(1);

    const current = currentRows.at(0);

    if (current === undefined) {
      return null;
    }

    if (current.version !== expectedVersion) {
      throw new Error('Immunization changed; reload it before saving');
    }

    const nextStatus = parsedPatch.status ?? current.status;

    let nextAdministeredDate = parsedPatch.administeredDate;

    if (nextAdministeredDate === undefined) {
      nextAdministeredDate =
        parsedPatch.status !== undefined &&
        parsedPatch.status !== 'administered'
          ? null
          : current.administeredDate;
    }

    assertAdministrationDate(nextStatus, nextAdministeredDate);

    const validatedPatch = updateImmunizationInputSchema.parse({
      ...parsedPatch,
      status: nextStatus,
      administeredDate: nextAdministeredDate,
    });

    const rows = await tx
      .update(immunizations)
      .set({
        ...validatedPatch,
        version: expectedVersion + 1,
      })
      .where(
        and(
          eq(immunizations.id, id),
          eq(immunizations.version, expectedVersion),
        ),
      )
      .returning();

    const row = rows.at(0);

    if (row === undefined) {
      throw new Error('Immunization changed; reload it before saving');
    }

    await writeAudit(tx, {
      actorId: parsedPatch.updatedBy ?? current.updatedBy ?? null,
      action: 'update',
      entityId: row.id,
      status: row.status,
    });

    return row;
  });
}

const buildScheduledRecord = (
  patientId: string,
  dateOfBirth: string,
  today: string,
  latest: Map<string, Immunization>,
  scheduled: (typeof ROUTINE_CHILDHOOD_SCHEDULE)[number],
): PatientImmunizationRecord => {
  const key = `${patientId}:${scheduled.vaccineKey}:${scheduled.doseNumber}`;
  const entry = latest.get(key);
  const targetDate = addCalendarMonths(dateOfBirth, scheduled.targetAgeMonths);

  if (entry === undefined) {
    return {
      id: scheduled.id,
      vaccineId: null,
      vaccineKey: scheduled.vaccineKey,
      vaccineName: scheduled.name,
      diseaseTarget: scheduled.diseaseTarget,
      doseNumber: scheduled.doseNumber,
      targetAgeMonths: scheduled.targetAgeMonths,
      ageLabel: scheduled.ageLabel,
      patientId,
      status: statusForScheduleItem(undefined, targetDate, today),
      administeredDate: null,
      dueDate: targetDate,
      nextDueDate: null,
      manufacturer: null,
      lotNumber: null,
      site: scheduled.site,
      route: scheduled.route,
      administeredById: null,
      administeredByName: null,
      facility: null,
      expiryDate: null,
      adverseEvents: null,
      notes: scheduled.notes ?? null,
      isScheduleItem: true,
      dataQualityWarning: null,
    };
  }

  return {
    id: scheduled.id,
    vaccineId: entry.vaccineId,
    vaccineKey: scheduled.vaccineKey,
    vaccineName: scheduled.name,
    diseaseTarget: scheduled.diseaseTarget,
    doseNumber: scheduled.doseNumber,
    targetAgeMonths: scheduled.targetAgeMonths,
    ageLabel: scheduled.ageLabel,
    patientId,
    status: statusForScheduleItem(entry, targetDate, today),
    administeredDate: entry.administeredDate,
    dueDate: entry.dueDate ?? targetDate,
    nextDueDate: entry.nextDueDate,
    manufacturer: entry.manufacturer,
    lotNumber: entry.lotNumber,
    site: entry.site ?? scheduled.site,
    route: entry.route ?? scheduled.route,
    administeredById: entry.administeredById,
    administeredByName: entry.administeredByName,
    facility: entry.facility,
    expiryDate: entry.expiryDate,
    adverseEvents: entry.adverseEvents,
    notes: entry.notes ?? scheduled.notes ?? null,
    isScheduleItem: true,
    dataQualityWarning:
      entry.status === 'administered' && entry.administeredDate === null
        ? 'The recorded administered status has no administration date'
        : null,
  };
};

export async function getPatientImmunizations(
  patientId: string,
  patientDob?: Date,
): Promise<Array<PatientImmunizationRecord>> {
  const patient = await db.query.patients.findFirst({
    where: { id: patientId },
    columns: { dateOfBirth: true },
  });

  if (patient === undefined) {
    throw new Error('Patient not found');
  }

  const dob = patientDob ?? parseDateOnly(patient.dateOfBirth);

  if (Number.isNaN(dob.getTime()) || dob.getTime() > Date.now()) {
    throw new Error('Patient date of birth is invalid');
  }

  const dateOfBirth = formatDateOnly(dob);

  const records = await db.query.immunizations.findMany({
    where: { patientId },
  });

  const latest = latestImmunizations(records);
  const today = formatDateOnly(new Date());

  const scheduledRecords: Array<PatientImmunizationRecord> =
    ROUTINE_CHILDHOOD_SCHEDULE.map((scheduled) =>
      buildScheduledRecord(patientId, dateOfBirth, today, latest, scheduled),
    );

  const latestRecordIds = new Set(
    Array.from(latest.values(), (record) => record.id),
  );

  const historicalRecords: Array<PatientImmunizationRecord> = [];

  for (const record of records) {
    if (latestRecordIds.has(record.id)) {
      continue;
    }

    historicalRecords.push({
      id: record.id,
      vaccineId: record.vaccineId,
      vaccineKey: record.vaccineKey,
      vaccineName: record.vaccineName,
      diseaseTarget: null,
      doseNumber: record.doseNumber,
      targetAgeMonths: record.targetAgeMonths,
      ageLabel: null,
      patientId,
      status: record.status,
      administeredDate: record.administeredDate,
      dueDate: record.dueDate,
      nextDueDate: record.nextDueDate,
      manufacturer: record.manufacturer,
      lotNumber: record.lotNumber,
      site: record.site,
      route: record.route,
      administeredById: record.administeredById,
      administeredByName: record.administeredByName,
      facility: record.facility,
      expiryDate: record.expiryDate,
      adverseEvents: record.adverseEvents,
      notes: record.notes,
      isScheduleItem: false,
      dataQualityWarning:
        record.status === 'administered' && record.administeredDate === null
          ? 'The recorded administered status has no administration date'
          : null,
    });
  }

  return [...scheduledRecords, ...historicalRecords];
}

export async function getCoverage(
  clinicId: string,
): Promise<ImmunizationCoverage> {
  const today = formatDateOnly(new Date());

  const weekEnd = formatDateOnly(
    new Date(parseDateOnly(today).getTime() + 7 * DAY_MS),
  );

  const rows = await db
    .select({
      patientId: patients.id,
      dateOfBirth: patients.dateOfBirth,
      isActive: patients.isActive,
      deletedAt: patients.deletedAt,
      vaccineKey: immunizations.vaccineKey,
      doseNumber: immunizations.doseNumber,
      status: immunizations.status,
      createdAt: immunizations.createdAt,
      updatedAt: immunizations.updatedAt,
      id: immunizations.id,
    })
    .from(patients)
    .leftJoin(immunizations, eq(immunizations.patientId, patients.id))
    .where(
      and(
        eq(patients.clinicId, clinicId),
        eq(patients.isActive, true),
        isNull(patients.deletedAt),
      ),
    );

  const patientDobById = new Map<string, string>();

  const records = rows.flatMap((row) => {
    patientDobById.set(row.patientId, row.dateOfBirth);

    if (
      row.vaccineKey === null ||
      row.status === null ||
      row.doseNumber === null ||
      row.id === null ||
      row.createdAt === null ||
      row.updatedAt === null
    ) {
      return [];
    }

    return [
      {
        patientId: row.patientId,
        vaccineKey: row.vaccineKey,
        doseNumber: row.doseNumber,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        id: row.id,
      },
    ];
  });

  const latest = latestImmunizations(records);

  let dueThisWeek = 0;
  let overdue = 0;
  let deferredOrRefused = 0;

  const perVaccine = new Map<
    string,
    {
      administered: number;
      due: number;
      overdue: number;
      deferredOrRefused: number;
    }
  >();

  for (const [patientId, dateOfBirth] of patientDobById) {
    for (const scheduled of ROUTINE_CHILDHOOD_SCHEDULE) {
      const targetDate = addCalendarMonths(
        dateOfBirth,
        scheduled.targetAgeMonths,
      );

      if (compareDateOnly(targetDate, weekEnd) > 0) {
        continue;
      }

      const recorded = latest.get(
        `${patientId}:${scheduled.vaccineKey}:${scheduled.doseNumber}`,
      );

      if (recorded?.status === 'contraindicated') {
        continue;
      }

      const perVaccineCounts = perVaccine.get(scheduled.vaccineKey) ?? {
        administered: 0,
        due: 0,
        overdue: 0,
        deferredOrRefused: 0,
      };

      if (recorded?.status === 'administered') {
        perVaccineCounts.administered += 1;
      } else if (
        recorded?.status === 'deferred' ||
        recorded?.status === 'refused'
      ) {
        perVaccineCounts.deferredOrRefused += 1;
        deferredOrRefused += 1;
      } else if (
        compareDateOnly(targetDate, today) < 0 ||
        recorded?.status === 'missed'
      ) {
        perVaccineCounts.overdue += 1;
        overdue += 1;
      } else {
        perVaccineCounts.due += 1;

        if (compareDateOnly(targetDate, weekEnd) <= 0) {
          dueThisWeek += 1;
        }
      }

      perVaccine.set(scheduled.vaccineKey, perVaccineCounts);
    }
  }

  const totals = {
    administered: 0,
    due: 0,
    overdue: 0,
    deferredOrRefused: 0,
  };

  for (const counts of perVaccine.values()) {
    totals.administered += counts.administered;
    totals.due += counts.due;
    totals.overdue += counts.overdue;
    totals.deferredOrRefused += counts.deferredOrRefused;
  }

  const denominator =
    totals.administered +
    totals.due +
    totals.overdue +
    totals.deferredOrRefused;

  const coveragePct =
    denominator === 0
      ? 0
      : Math.round((totals.administered / denominator) * 100);

  const byVaccine = [...perVaccine.entries()].map(([vaccineKey, counts]) => {
    const vaccine = ROUTINE_CHILDHOOD_SCHEDULE.find(
      (item) => item.vaccineKey === vaccineKey,
    );

    const total =
      counts.administered +
      counts.due +
      counts.overdue +
      counts.deferredOrRefused;

    return {
      vaccineKey,
      vaccineName: vaccine?.name ?? vaccineKey,
      administered: counts.administered,
      due: counts.due,
      overdue: counts.overdue,
      pct: total === 0 ? 0 : Math.round((counts.administered / total) * 100),
    };
  });

  return { dueThisWeek, overdue, coveragePct, deferredOrRefused, byVaccine };
}

export async function getImmunizationMatrix(
  clinicId: string,
  filter: {
    ageBracket?: '0-6' | '6-12' | '12-24' | '>24';
    onlyOverdue?: boolean;
  },
): Promise<MatrixResult> {
  const vaccinesByKey = new Map<string, MatrixVaccine>();

  for (const scheduled of ROUTINE_CHILDHOOD_SCHEDULE) {
    const vaccine = vaccinesByKey.get(scheduled.vaccineKey);

    if (vaccine === undefined) {
      vaccinesByKey.set(scheduled.vaccineKey, {
        vaccineKey: scheduled.vaccineKey,
        vaccineName: scheduled.name,
        doseNumbers: [scheduled.doseNumber],
        doses: undefined,
      });
    } else if (!vaccine.doseNumbers.includes(scheduled.doseNumber)) {
      vaccine.doseNumbers.push(scheduled.doseNumber);
      vaccine.doseNumbers.sort((left, right) => left - right);
    }
  }

  const vaccines = [...vaccinesByKey.values()];
  const today = new Date();

  const allPatients = await db
    .select({
      id: patients.id,
      mrn: patients.mrn,
      firstName: patients.firstName,
      lastName: patients.lastName,
      sex: patients.sex,
      dateOfBirth: patients.dateOfBirth,
    })
    .from(patients)
    .where(
      and(
        eq(patients.clinicId, clinicId),
        eq(patients.isActive, true),
        isNull(patients.deletedAt),
      ),
    );

  const filtered = allPatients
    .filter((patient) =>
      matchesAgeBracket(patient.dateOfBirth, filter.ageBracket, today),
    )
    .toSorted(
      (left, right) =>
        left.lastName.localeCompare(right.lastName) ||
        left.firstName.localeCompare(right.firstName),
    );

  if (filtered.length === 0) {
    return { vaccines, rows: [] };
  }

  const records = await db
    .select()
    .from(immunizations)
    .where(
      inArray(
        immunizations.patientId,
        filtered.map((patient) => patient.id),
      ),
    );

  const latest = latestImmunizations(records);
  const todayDateOnly = formatDateOnly(today);

  const rows: Array<MatrixRow> = filtered.map((patient) => {
    const cells: MatrixRow['cells'] = {};

    for (const scheduled of ROUTINE_CHILDHOOD_SCHEDULE) {
      const targetDate = addCalendarMonths(
        patient.dateOfBirth,
        scheduled.targetAgeMonths,
      );

      const record = latest.get(
        `${patient.id}:${scheduled.vaccineKey}:${scheduled.doseNumber}`,
      );

      cells[`${scheduled.vaccineKey}-${scheduled.doseNumber}`] =
        statusForMatrix(record?.status, targetDate, todayDateOnly);
    }

    return {
      patientId: patient.id,
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
      sex: patient.sex,
      dateOfBirth: patient.dateOfBirth,
      cells,
    };
  });

  const visibleRows =
    filter.onlyOverdue === true
      ? rows.filter((row) =>
          Object.values(row.cells).some((status) => status === 'overdue'),
        )
      : rows;

  return { vaccines, rows: visibleRows };
}
