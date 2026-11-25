import type { auditLog, user } from './auth';
import type {
  appointments,
  clinics,
  diagnoses,
  immunizations,
  medicalNotes,
  patients,
  visits,
} from './clinic';
import type {
  appointmentStatuses,
  auditActions,
  diagnosisTypes,
  immunizationStatuses,
  lmsXAxes,
  measurementIndicators,
  patientSexes,
} from './enums';
import type { lmsReferences, measurements } from './growth';
import type {
  drugFormulary,
  neonatalFormulary,
  prescriptions,
} from './prescriptions';

export type AuditAction = (typeof auditActions)[number];

export type PatientSex = (typeof patientSexes)[number];

export type AppointmentStatus = (typeof appointmentStatuses)[number];

export type MeasurementIndicator = (typeof measurementIndicators)[number];

export type LmsXAxis = (typeof lmsXAxes)[number];

export type DiagnosisType = (typeof diagnosisTypes)[number];

export type ImmunizationStatus = (typeof immunizationStatuses)[number];

export type NeonatalFormularyRow = typeof neonatalFormulary.$inferSelect;

export type NewNeonatalFormularyRow = typeof neonatalFormulary.$inferInsert;
// ============================================================================
// Inferred types
// ============================================================================

export type User = typeof user.$inferSelect;

export type NewUser = typeof user.$inferInsert;

export type Clinic = typeof clinics.$inferSelect;

export type NewClinic = typeof clinics.$inferInsert;

export type Patient = typeof patients.$inferSelect;

export type NewPatient = typeof patients.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;

export type NewAppointment = typeof appointments.$inferInsert;

export type Visit = typeof visits.$inferSelect;

export type NewVisit = typeof visits.$inferInsert;

export type Measurement = typeof measurements.$inferSelect;

export type NewMeasurement = typeof measurements.$inferInsert;

export type Diagnosis = typeof diagnoses.$inferSelect;

export type NewDiagnosis = typeof diagnoses.$inferInsert;

export type Prescription = typeof prescriptions.$inferSelect;

export type NewPrescription = typeof prescriptions.$inferInsert;

export type MedicalNote = typeof medicalNotes.$inferSelect;

export type NewMedicalNote = typeof medicalNotes.$inferInsert;

export type Immunization = typeof immunizations.$inferSelect;

export type NewImmunization = typeof immunizations.$inferInsert;

export type AuditLogEntry = typeof auditLog.$inferSelect;

export type NewAuditLogEntry = typeof auditLog.$inferInsert;

export type LmsReference = typeof lmsReferences.$inferSelect;

export type NewLmsReference = typeof lmsReferences.$inferInsert;

export type DrugFormularyRow = typeof drugFormulary.$inferSelect;

export type NewDrugFormularyRow = typeof drugFormulary.$inferInsert;

export interface MatrixVaccine {
  doses: number | undefined;
  vaccineKey: string;
  vaccineName: string;
  /** Actual dose numbers in render order, e.g. [0, 1, 2, 3] for OPV. */
  doseNumbers: Array<number>;
}

export interface MatrixRow {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  sex: 'male' | 'female';
  dateOfBirth: string;
  /** key = `${vaccineKey}-${doseNumber}`, value = resolved status */
  cells: Record<
    string,
    | 'administered'
    | 'planned'
    | 'due'
    | 'overdue'
    | 'deferred'
    | 'missed'
    | 'refused'
    | 'contraindicated'
  >;
}

export interface MatrixResult {
  vaccines: Array<MatrixVaccine>;
  rows: Array<MatrixRow>;
}

export interface ImmunizationCoverage {
  dueThisWeek: number;
  overdue: number;
  coveragePct: number;
  deferredOrRefused: number;
  byVaccine: Array<{
    vaccineKey: string;
    vaccineName: string;
    administered: number;
    due: number;
    overdue: number;
    pct: number;
  }>;
}

export interface VaccineScheduleItem {
  id: string;
  vaccineKey: string;
  name: string;
  diseaseTarget: string;
  doseNumber: number;
  targetAgeMonths: number;
  ageLabel: string;
  route:
    | 'Oral'
    | 'Intramuscular (IM)'
    | 'Subcutaneous (SC)'
    | 'Intradermal (ID)';
  site: 'Anterolateral Thigh' | 'Deltoid' | 'Mouth' | 'Left Forearm';
  notes?: string;
}

export interface PatientImmunizationRecord {
  id: string;
  vaccineId: string | null;
  vaccineKey: string;
  vaccineName: string;
  diseaseTarget: string | null;
  doseNumber: number | null;
  targetAgeMonths: number | null;
  ageLabel: string | null;
  patientId: string;
  status: ImmunizationStatus | 'overdue';
  administeredDate: Date | null;
  dueDate: string | null;
  nextDueDate: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  site: string | null;
  route: string | null;
  administeredById: string | null;
  administeredByName: string | null;
  facility: string | null;
  expiryDate: string | null;
  adverseEvents: string | null;
  notes: string | null;
  isScheduleItem: boolean;
  dataQualityWarning: string | null;
}

export type PatientVaccinationRecord = PatientImmunizationRecord;
