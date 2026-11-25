import { pgEnum } from 'drizzle-orm/pg-core';

import { IMMUNIZATION_STATUSES } from '@/lib/features/immunizations';

export const userRoles = ['admin', 'doctor', 'patient', 'staff'] as const;
export const patientGenders = ['boy', 'girl'] as const;
export const patientSexes = ['male', 'female'] as const;

export const appointmentStatuses = [
  'scheduled',
  'completed',
  'cancelled',
  'no-show',
] as const;

export const queueStatuses = [
  'WAITING',
  'IN_VITALS',
  'WITH_DOCTOR',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

export const immunizationStatuses = IMMUNIZATION_STATUSES;

export const prescriptionStatuses = [
  'active',
  'completed',
  'cancelled',
] as const;

export const milestoneDomains = [
  'gross-motor',
  'fine-motor',
  'language',
  'social-cognitive',
] as const;

export const measurementIndicators = [
  'weight-for-age',
  'length-for-age',
  'weight-for-length',
  'bmi-for-age',
  'head-circumference-for-age',
] as const;

export const lmsXAxes = ['age', 'length'] as const;
export const diagnosisTypes = ['primary', 'secondary'] as const;
export const auditActions = ['create', 'update', 'delete', 'view'] as const;
export const ledgerKinds = ['expense', 'revenue'] as const;
export const growthMetrics = ['lhfa', 'wfa'] as const;
export const growthGenders = ['boys', 'girls'] as const;
export const visitStatuses = ['scheduled', 'completed', 'cancelled'] as const;
export const audit_actions = ['create', 'update', 'delete', 'view'] as const;
export const ledger_kinds = ['expense', 'revenue'] as const;

export const prescriptionMedicationRoutes = [
  'IV',
  'IM',
  'Oral',
  'Inhalation',
  'PR',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle pgEnums
// ─────────────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', userRoles);
export const patientGenderEnum = pgEnum('patient_gender', patientGenders);
export const patientSexEnum = pgEnum('patient_sex', patientSexes);

export const appointmentStatusEnum = pgEnum(
  'appointment_status',
  appointmentStatuses,
);

export const queueStatusEnum = pgEnum('queue_status', queueStatuses);

export const immunizationStatusEnum = pgEnum(
  'immunization_status',
  immunizationStatuses,
);

export const prescriptionStatusEnum = pgEnum(
  'prescription_status',
  prescriptionStatuses,
);

export const milestoneDomainEnum = pgEnum('milestone_domain', milestoneDomains);

export const measurementIndicatorEnum = pgEnum(
  'measurement_indicator',
  measurementIndicators,
);

export const lmsXAxisEnum = pgEnum('lms_x_axis', lmsXAxes);
export const diagnosisTypeEnum = pgEnum('diagnosis_type', diagnosisTypes);
export const auditActionEnum = pgEnum('audit_action', auditActions);
export const ledgerKindEnum = pgEnum('ledger_kind', ledgerKinds);
export const growthMetricEnum = pgEnum('growth_metric', growthMetrics);
export const growthGenderEnum = pgEnum('growth_gender', growthGenders);
export const visitStatusEnum = pgEnum('visit_status', visitStatuses);

// ─────────────────────────────────────────────────────────────────────────────
// Zod Enum Schemas
// ─────────────────────────────────────────────────────────────────────────────
