// apps/web/src/lib/types.ts
/** Shared frontend clinical data shapes.
 *  For strict RPC typing, prefer inferred tRPC types: RouterOutputs['router']['procedure'] */

export type Sex = "male" | "female";

export type EncounterStatus =
	| "scheduled"
	| "in_progress"
	| "completed"
	| "cancelled";

export type PrescriptionStatus = "active" | "completed" | "cancelled";

export interface VitalsSnapshot {
	tempC?: number | null;
	heartRateBpm?: number | null;
	respiratoryRateBpm?: number | null;
	spo2Pct?: number | null;
	bloodPressure?: string | null;
	weightKg?: number | null;
	lengthCm?: number | null;
	headCircumferenceCm?: number | null;
}

export interface PediatricPatientSummary {
	id: string;
	clinicId: string;
	mrn: string;
	firstName: string;
	lastName: string;
	sex: Sex;
	dateOfBirth: string;
	phone?: string | null;
	parentName?: string | null;
	parentPhone?: string | null;
	allergies?: string | null;
	weightKg?: number | null;
	gestationalAgeWeeks?: number | null;
	birthWeightKg?: number | null;
	birthLengthCm?: number | null;
	birthHeadCircumferenceCm?: number | null;
	isActive?: boolean;
}

export interface ClinicalEncounterSummary {
	id: string;
	clinicId: string;
	patientId: string;
	doctorId?: string | null;
	status: EncounterStatus | string;
	chiefComplaint?: string | null;
	subjective?: string | null;
	objective?: string | null;
	assessment?: string | null;
	plan?: string | null;
	vitals?: VitalsSnapshot | null;
	visitedAt: string | Date;
}

export interface PrescriptionItem {
	id: string;
	visitId?: string | null;
	patientId: string;
	drugName: string;
	genericName?: string | null;
	doseMgPerKg?: number | null;
	calculatedDoseMg?: number | null;
	calculatedVolumeMl?: number | null;
	frequency?: string | null;
	durationDays?: number | null;
	route?: string | null;
	instructions?: string | null;
	status?: PrescriptionStatus | string;
	createdAt?: string | Date;
}

export interface GrowthMeasurementPoint {
	id?: string;
	patientId?: string;
	ageMonths: number;
	weightKg?: number | null;
	lengthCm?: number | null;
	headCircumferenceCm?: number | null;
	bmi?: number | null;
	zScore?: number | null;
	percentile?: number | null;
	recordedAt?: string | Date;
}

export interface ImmunizationRecordItem {
	id: string;
	patientId: string;
	vaccineCode: string;
	vaccineName: string;
	doseNumber: number;
	dueDate?: string | null;
	administeredAt?: string | Date | null;
	lotNumber?: string | null;
	status: "due" | "administered" | "overdue" | "deferred" | string;
}

export interface ClinicJobItem {
	id: string;
	kind: string;
	status: string;
	progress?: number;
	progressMessage?: string;
	resultJson?: unknown;
	errorMessage?: string | null;
	createdAt?: string | Date;
	updatedAt?: string | Date;
}
