// src/db/validation.ts

import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema
} from "drizzle-orm/zod";
import { z } from "zod/v4";
import {
	immunizationInputSchema,
	updateImmunizationInputSchema
} from "@/lib/features/immunizations";

import * as schema from "./schema";

// ============================================================================
// Auth / identity
// ============================================================================

export const userSelectSchema = createSelectSchema(schema.user);
export const userInsertSchema = createInsertSchema(schema.user, {
	name: s => s.min(1).max(120),
	email: z.email().max(254),
	role: z.enum(["doctor", "staff", "patient", "admin"]).optional(),
	phone: s => s.min(7).max(20),
	address: s => s.max(500)
});
export const userUpdateSchema = createUpdateSchema(schema.user, {
	name: s => s.min(1).max(120),
	email: z.email().max(254),
	phone: s => s.min(8).max(14)
});

export const sessionSelectSchema = createSelectSchema(schema.session);
export const accountSelectSchema = createSelectSchema(schema.account);
export const verificationSelectSchema = createSelectSchema(schema.verification);

export const visitSelectSchema = createSelectSchema(schema.visits);
export const visitInsertSchema = createInsertSchema(schema.visits, {
	ageMonths: s => s.min(0).max(1200), // up to 100 years
	ageYears: s => s.int().min(0).max(100),
	ageMonthsRemainder: s => s.int().min(0).max(11)
});
export const visitUpdateSchema = createUpdateSchema(schema.visits, {
	ageMonths: s => s.min(0).max(1200)
});

// ============================================================================
// Measurements
// ============================================================================

// ============================================================================
// LMS references (seeding/imports only — not user-facing writes)
// ============================================================================

// ============================================================================
// Diagnoses
// ============================================================================

// ============================================================================
// Medical notes
// ============================================================================

export const medicalNoteSelectSchema = createSelectSchema(schema.medicalNotes);
export const medicalNoteInsertSchema = createInsertSchema(schema.medicalNotes, {
	title: s => s.min(1).max(255),
	body: s => s.max(10000)
});
export const medicalNoteUpdateSchema = createUpdateSchema(schema.medicalNotes, {
	title: s => s.min(1).max(255),
	body: s => s.max(10000)
});

// ============================================================================
// Audit log
// ============================================================================

export const auditLogSelectSchema = createSelectSchema(schema.auditLog);
export const auditLogInsertSchema = createInsertSchema(schema.auditLog, {
	entity: s => s.min(1).max(64),
	entityId: s => s.min(1).max(64),
	metadata: z
		.object({
			before: z.record(z.string(), z.unknown()).optional(),
			after: z.record(z.string(), z.unknown()).optional()
		})
		.nullable()
		.optional()
});

// ============================================================================
// Inferred input/output types
// ============================================================================

export type VisitInput = z.infer<typeof visitInsertSchema>;
export type VisitUpdateInput = z.infer<typeof visitUpdateSchema>;

export type MedicalNoteInput = z.infer<typeof medicalNoteInsertSchema>;
export type MedicalNoteUpdateInput = z.infer<typeof medicalNoteUpdateSchema>;

export type AuditLogInput = z.infer<typeof auditLogInsertSchema>;
export const lmsSelectSchema = createSelectSchema(schema.lmsReferences);
export const lmsInsertSchema = createInsertSchema(schema.lmsReferences, {
	xValue: s => s.min(0)
});
export const immunizationSelectSchema = createSelectSchema(
	schema.immunizations
);
export const immunizationInsertSchema = immunizationInputSchema;
export const immunizationUpdateSchema = updateImmunizationInputSchema;

export type Visit = typeof schema.visits.$inferSelect;
export type NewVisit = typeof schema.visits.$inferInsert;

export const userRoleSchema = z.enum(schema.userRoles);
export const patientGenderSchema = z.enum(schema.patientGenders);
export const patientSexSchema = z.enum(schema.patientSexes);
export const appointmentStatusSchema = z.enum(schema.appointmentStatuses);
export const queueStatusSchema = z.enum(schema.queueStatuses);
export const immunizationStatusSchema = z.enum(schema.immunizationStatuses);
export const prescriptionStatusSchema = z.enum(schema.prescriptionStatuses);
export const milestoneDomainSchema = z.enum(schema.milestoneDomains);
export const measurementIndicatorSchema = z.enum(schema.measurementIndicators);
export const lmsIndicatorSchema = measurementIndicatorSchema;
export const lmsSexSchema = patientSexSchema;
export const lmsXAxisSchema = z.enum(schema.lmsXAxes);
export const diagnosisTypeSchema = z.enum(schema.diagnosisTypes);
export const auditActionSchema = z.enum(schema.auditActions);
export const ledgerKindSchema = z.enum(schema.ledgerKinds);
export const growthMetricSchema = z.enum(schema.growthMetrics);
export const growthGenderSchema = z.enum(schema.growthGenders);
export const visitStatusSchema = z.enum(schema.visitStatuses);
export const prescriptionMedicationRouteSchema = z.enum(
	schema.prescriptionMedicationRoutes
);

export const prescriptionMedicationSchema = z.object({
	drugId: z.string().min(1),
	name: z.string().min(1),
	dose: z.string().min(1),
	frequency: z.string().min(1),
	duration: z.string().min(1),
	route: prescriptionMedicationRouteSchema,
	instructions: z.string().optional()
});

// ─────────────────────────────────────────────────────────────────────────────
// Inferred Types
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = z.infer<typeof userRoleSchema>;
export type PatientGender = z.infer<typeof patientGenderSchema>;
export type PatientSex = z.infer<typeof patientSexSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type QueueStatus = z.infer<typeof queueStatusSchema>;
export type ImmunizationStatus = z.infer<typeof immunizationStatusSchema>;
export type PrescriptionStatus = z.infer<typeof prescriptionStatusSchema>;
export type MilestoneDomain = z.infer<typeof milestoneDomainSchema>;
export type Indicator = z.infer<typeof measurementIndicatorSchema>;
export type MeasurementIndicator = z.infer<typeof measurementIndicatorSchema>;
export type LmsIndicator = z.infer<typeof lmsIndicatorSchema>;
export type LmsSex = z.infer<typeof lmsSexSchema>;
export type LmsXAxis = z.infer<typeof lmsXAxisSchema>;
export type DiagnosisType = z.infer<typeof diagnosisTypeSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
export type LedgerKind = z.infer<typeof ledgerKindSchema>;
export type GrowthMetric = z.infer<typeof growthMetricSchema>;
export type GrowthGender = z.infer<typeof growthGenderSchema>;
export type VisitStatus = z.infer<typeof visitStatusSchema>;
export type PrescriptionMedicationRoute = z.infer<
	typeof prescriptionMedicationRouteSchema
>;
export type PrescriptionMedication = z.infer<
	typeof prescriptionMedicationSchema
>;
