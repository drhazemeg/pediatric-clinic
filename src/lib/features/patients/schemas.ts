import { z } from "zod";

export const listPatientsInputSchema = z.object({
	clinicId: z.string().min(1),
	q: z.string().trim().max(120).optional()
});

export const patientIdInputSchema = z.object({
	patientId: z.string().min(1)
});

export const growthSeriesInputSchema = z.object({
	patientId: z.string().min(1),
	indicator: z.enum([
		"weight-for-age",
		"length-for-age",
		"weight-for-length",
		"bmi-for-age"
	])
});

export const growthCurvesInputSchema = z.object({
	indicator: z.enum([
		"weight-for-age",
		"length-for-age",
		"weight-for-length",
		"bmi-for-age"
	]),
	sex: z.enum(["male", "female"]),
	xAxis: z.enum(["age", "length"]),
	min: z.number().finite(),
	max: z.number().finite()
});
export const createPatientSchema = z.object({
	clinicId: z.string().min(1).nullable().optional(),
	providerId: z.string().min(1).nullable().optional(),
	mrn: z.string().min(1).max(64),
	firstName: z.string().min(1).max(120),
	lastName: z.string().min(1).max(120),
	sex: z.enum(["male", "female"]),
	dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
	phone: z.string().max(40).nullable().optional(),
	address: z.string().max(500).nullable().optional(),
	allergies: z.string().max(1000).nullable().optional(),
	gestationalAgeWeeks: z.number().min(20).max(45).nullable().optional(),
	birthWeightKg: z.number().positive().max(15).nullable().optional(),
	birthLengthCm: z.number().positive().max(100).nullable().optional(),
	birthHeadCircumferenceCm: z.number().positive().max(80).nullable().optional(),
	weightKg: z.number().positive().max(250).nullable().optional(),
	parentName: z.string().max(160).nullable().optional(),
	parentPhone: z.string().max(40).nullable().optional(),
	notes: z.string().max(4000).nullable().optional()
});

export const updatePatientSchema = createPatientSchema
	.omit({ mrn: true })
	.partial()
	.extend({
		id: z.string().min(1),
		expectedVersion: z.number().int().min(1).optional()
	});
