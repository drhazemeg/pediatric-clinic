import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { id, timestamps } from './columns';
import {
  appointmentStatusEnum,
  diagnosisTypeEnum,
  immunizationStatusEnum,
  patientSexEnum,
  queueStatusEnum,
  visitStatusEnum,
} from './enums';

export const clinics = pgTable('clinics', {
  id: id(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  ...timestamps(),
});

export function auditFields() {
  return {
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    updatedBy: text('updated_by').references(() => user.id, {
      onDelete: 'set null',
    }),
  };
}

export const patients = pgTable(
  'patients',
  {
    id: id(),
    clinicId: text('clinic_id').references(() => clinics.id, {
      onDelete: 'set null',
    }),
    providerId: text('provider_id').references(() => user.id, {
      onDelete: 'cascade',
    }),
    mrn: text('mrn').notNull(),
    bloodType: text('blood_type'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    sex: patientSexEnum('sex').notNull(),
    dateOfBirth: date('date_of_birth', { mode: 'string' }).notNull(),
    phone: text('phone'),
    address: text('address'),
    allergies: text('allergies'),
    gestationalAgeWeeks: real('gestational_age_weeks'),
    birthWeightKg: real('birth_weight_kg'),
    birthLengthCm: real('birth_length_cm'),
    birthHeadCircumferenceCm: real('birth_head_circumference_cm'),
    weightKg: real('weight_kg'),
    parentName: text('parent_name'),
    parentPhone: text('parent_phone'),
    notes: text('notes'),
    version: integer('version').notNull().default(1),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    ...auditFields(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('patients_clinic_mrn_unq').on(t.clinicId, t.mrn),
    index('patients_provider_idx').on(t.providerId),
    index('patients_clinic_idx').on(t.clinicId),
    index('patients_name_idx').on(t.lastName, t.firstName),
    index('patients_dob_idx').on(t.dateOfBirth),
    index('patients_active_idx')
      .on(t.providerId, t.createdAt, t.id)
      .where(sql`${t.deletedAt} IS NULL`),
    check('patients_version_positive_check', sql`${t.version} >= 1`),
  ],
);

export const guardianLinks = pgTable(
  'guardian_links',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    guardianName: text('guardian_name'),
    phone: text('phone'),
    relation: text('relation').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.patientId] }),
    index('guardian_links_patient_id_idx').on(t.patientId),
  ],
);

export const appointments = pgTable(
  'appointments',
  {
    id: id(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    clinicId: text('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    doctorId: text('doctor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(15),
    status: appointmentStatusEnum('status').notNull().default('scheduled'),
    reason: text('reason'),
    notes: text('notes'),
    ...timestamps(),
  },
  (t) => [
    index('appointments_patient_idx').on(t.patientId, t.scheduledAt),
    index('appointments_clinic_idx').on(t.clinicId, t.scheduledAt),
    index('appointments_doctor_idx').on(t.doctorId, t.scheduledAt),
    index('appointments_status_idx').on(t.status),
    check(
      'appointments_duration_positive_check',
      sql`${t.durationMinutes} > 0`,
    ),
  ],
);

export const visits = pgTable(
  'visits',
  {
    id: id(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    clinicId: text('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    appointmentId: text('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
    }),
    doctorId: text('doctor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    visitedAt: timestamp('visited_at', { withTimezone: true }).notNull(),
    status: visitStatusEnum('status').notNull().default('completed'),
    ageMonths: real('age_months').notNull(),
    ageYears: integer('age_years'),
    ageMonthsRemainder: integer('age_months_remainder'),
    chiefComplaint: text('chief_complaint'),
    diagnosis: text('diagnosis'),
    symptoms: text('symptoms'),
    physicalExam: text('physical_exam'),
    plan: text('plan'),
    notes: text('notes'),
    ...timestamps(),
  },
  (t) => [
    index('visits_patient_idx').on(t.patientId, t.visitedAt),
    index('visits_clinic_idx').on(t.clinicId, t.visitedAt),
    index('visits_doctor_idx').on(t.doctorId, t.visitedAt),
    check('visits_age_months_nonneg_check', sql`${t.ageMonths} >= 0`),
  ],
);

export const medicalNotes = pgTable(
  'medical_notes',
  {
    id: id(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    visitId: text('visit_id').references(() => visits.id, {
      onDelete: 'set null',
    }),
    authorId: text('author_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    body: text('body'),
    ...timestamps(),
  },
  (t) => [
    index('medical_notes_patient_idx').on(t.patientId, t.createdAt),
    index('medical_notes_visit_idx').on(t.visitId),
  ],
);

export const idempotency = pgTable('idempotency', {
  id: text('id').primaryKey(),
  requestHash: text('request_hash').notNull().unique(),
  key: text('key').notNull().unique(),
  result: jsonb('result').notNull(),
  ...timestamps(),
});

export const diagnoses = pgTable(
  'diagnoses',
  {
    id: id(),
    visitId: text('visit_id')
      .notNull()
      .references(() => visits.id, { onDelete: 'cascade' }),
    icdCode: text('icd_code').notNull(),
    description: text('description').notNull(),
    type: diagnosisTypeEnum('type').notNull().default('primary'),
    ...timestamps(),
  },
  (t) => [
    index('diagnoses_visit_idx').on(t.visitId),
    index('diagnoses_icd_idx').on(t.icdCode),
  ],
);

export const vaccineCatalog = pgTable(
  'vaccine_catalog',
  {
    id: text('id').primaryKey(),
    label: text('label').notNull(),
    arabicLabel: text('arabic_label'),
    disease: text('disease').notNull(),
    recommendedAgeMonths: integer('recommended_age_months').notNull(),
    recommendedAgeLabel: text('recommended_age_label').notNull(),
    schedule: text('schedule').notNull().default('egypt-moh'),
    isMandatoryMoh: boolean('is_mandatory_moh').notNull().default(true),
    notes: text('notes'),
  },
  (t) => [
    index('vaccine_catalog_age_idx').on(t.recommendedAgeMonths),
    index('vaccine_catalog_schedule_idx').on(t.schedule),
  ],
);

export const certificates = pgTable(
  'certificates',
  {
    id: id(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    issueDate: date('issue_date', { mode: 'string' }).notNull(),
    certificateType: text('certificate_type').notNull(),
    title: text('title').notNull(),
    diagnosis: text('diagnosis'),
    body: text('body').notNull(),
    issuedBy: text('issued_by'),
    notes: text('notes'),
    ...auditFields(),
    ...timestamps(),
  },
  (t) => [
    index('certificates_patient_idx').on(t.patientId),
    index('certificates_date_idx').on(t.issueDate),
  ],
);

export const immunizations = pgTable(
  'immunizations',
  {
    id: id(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    visitId: text('visit_id').references(() => visits.id, {
      onDelete: 'set null',
    }),
    vaccineId: text('vaccine_id').references(() => vaccineCatalog.id, {
      onDelete: 'set null',
    }),
    vaccineKey: text('vaccine_key').notNull(),
    vaccineName: text('vaccine_name').notNull(),
    doseNumber: integer('dose_number').default(1),
    targetAgeMonths: real('target_age_months').notNull(),
    status: immunizationStatusEnum('status').notNull().default('planned'),
    administeredDate: timestamp('administered_date', { withTimezone: true }),
    dueDate: date('due_date', { mode: 'string' }),
    nextDueDate: date('next_due_date', { mode: 'string' }),
    manufacturer: text('manufacturer'),
    lotNumber: text('lot_number'),
    site: text('site'),
    route: text('route'),
    administeredById: text('administered_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    administeredByName: text('administered_by_name'),
    facility: text('facility'),
    expiryDate: date('expiry_date', { mode: 'string' }),
    adverseEvents: text('adverse_events'),
    notes: text('notes'),
    version: integer('version').notNull().default(1),
    ...auditFields(),
    ...timestamps(),
  },
  (t) => [
    index('immunizations_patient_idx').on(t.patientId, t.targetAgeMonths),
    index('immunizations_patient_dose_idx').on(
      t.patientId,
      t.vaccineKey,
      t.doseNumber,
      t.updatedAt,
    ),
    index('immunizations_visit_idx').on(t.visitId),
    index('immunizations_vaccine_idx').on(t.vaccineId),
    index('immunizations_status_idx').on(t.status),
    index('immunizations_due_idx').on(t.dueDate, t.status),
    index('immunizations_administered_date_idx').on(t.administeredDate),
    check(
      'immunizations_dose_nonnegative_check',
      sql`${t.doseNumber} IS NULL OR ${t.doseNumber} >= 0`,
    ),
    check(
      'immunizations_target_age_nonnegative_check',
      sql`${t.targetAgeMonths} >= 0`,
    ),
    check('immunizations_version_positive_check', sql`${t.version} >= 1`),
  ],
);

export const clinicQueue = pgTable(
  'clinic_queue',
  {
    id: id(),
    clinicId: text('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    appointmentId: text('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
    }),
    doctorId: text('doctor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    queueNumber: integer('queue_number').notNull(),
    status: queueStatusEnum('status').notNull().default('WAITING'),
    // 0: normal, 1: urgent/special-care
    priority: integer('priority').notNull().default(0),
    isWalkIn: boolean('is_walk_in').notNull().default(false),
    chiefComplaint: text('chief_complaint'),
    calledAt: timestamp('called_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...auditFields(),
    ...timestamps(),
  },
  (t) => [
    index('clinic_queue_clinic_date_idx').on(t.clinicId, t.createdAt),
    index('clinic_queue_status_idx').on(t.clinicId, t.status),
    index('clinic_queue_patient_idx').on(t.patientId),
    index('clinic_queue_doctor_idx').on(t.doctorId),
  ],
);
