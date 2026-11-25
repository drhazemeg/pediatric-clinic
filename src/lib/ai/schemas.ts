import { z } from "zod";

export const taskKindSchema = z.enum([
	"soap_note",
	"patient_education",
	"differential_dx",
	"pediatric_dosing_safety",
	"growth_interpretation",
	"immunization_advice",
	"follow_up_questions"
]);
export type TaskKind = z.infer<typeof taskKindSchema>;

// ============================================================================
// Clinical SOAP Note Draft
// ============================================================================

export const soapNoteSchema = z.object({
	subjective: z.string().min(1),
	objective: z.string().min(1),
	assessment: z.string().min(1),
	plan: z.string().min(1),
	icd10Suggestions: z
		.array(
			z.object({
				code: z.string(),
				description: z.string(),
				confidence: z.number().min(0).max(1)
			})
		)
		.default([]),
	redFlags: z.array(z.string()).default([]),
	pediatricPearls: z.array(z.string()).default([]),
	disclaimer: z
		.string()
		.default(
			"Clinical decision support advisory only. The treating physician retains sole responsibility for diagnosis and prescribing."
		)
});
export type SoapNote = z.infer<typeof soapNoteSchema>;

// ============================================================================
// Bilingual Patient & Parent Home Care Instructions
// ============================================================================

export const patientEducationSchema = z.object({
	title: z.string().min(1),
	summary: z.string().min(1),
	homeCareSteps: z.array(z.string()).min(1),
	feedingAndFluids: z.string().min(1),
	medicationGuidance: z.string().default(""),
	dangerSignsToSeekEmergency: z.array(z.string()).min(1), // علامات الخطورة
	expectedRecoveryTimeline: z.string().optional(),
	language: z.enum(["ar", "en"]).default("ar"),
	readingLevel: z.enum(["parents", "general", "clinician"]).default("parents")
});
export type PatientEducation = z.infer<typeof patientEducationSchema>;

// ============================================================================
// Pediatric Differential Diagnosis
// ============================================================================

export const differentialDxSchema = z.object({
	differentials: z
		.array(
			z.object({
				diagnosis: z.string().min(1),
				icd10: z.string().optional(),
				likelihood: z.enum(["high", "medium", "low"]),
				supportingFindings: z.array(z.string()),
				againstFindings: z.array(z.string()),
				nextSteps: z.array(z.string())
			})
		)
		.min(1),
	redFlags: z.array(z.string()).default([]),
	disclaimer: z
		.string()
		.default("Differential suggestions for physician evaluation only.")
});
export type DifferentialDx = z.infer<typeof differentialDxSchema>;

// ============================================================================
// Pediatric Dosing Safety Check
// ============================================================================

export const pediatricDosingSafetySchema = z.object({
	drugName: z.string().min(1),
	proposedDose: z.string().min(1),
	weightKg: z.number().positive(),
	ageMonths: z.number().min(0),
	standardDoseRange: z.string(),
	doseUnit: z.enum([
		"mg/kg/dose",
		"mg/kg/day",
		"fixed_mg",
		"mcg/kg/dose",
		"mcg/kg/day",
		"drops",
		"puffs"
	]),
	isDoseWithinRange: z.boolean(),
	maxRecommendedDailyDose: z.string().optional(),
	warnings: z.array(z.string()).default([]),
	neonatalConsiderations: z.string().optional(),
	organAdjustment: z.string().optional(),
	clinicalVerdict: z.enum([
		"appropriate",
		"caution",
		"unsafe_overdose",
		"underdose"
	]),
	disclaimer: z
		.string()
		.default(
			"Independent dosing calculation tool. The prescribing physician must verify all doses before administration."
		)
});
export type PediatricDosingSafety = z.infer<typeof pediatricDosingSafetySchema>;

// ============================================================================
// Growth & Milestone Interpretation
// ============================================================================

export const growthInterpretationSchema = z.object({
	summary: z.string().min(1),
	weightStatus: z.string(),
	heightStatus: z.string(),
	headCircumferenceStatus: z.string().optional(),
	falteringGrowthRisk: z.boolean(),
	concerns: z.array(z.string()).default([]),
	nutritionalCounseling: z.array(z.string()).min(1),
	anticipatoryMilestones: z.array(z.string()).default([]),
	recommendedFollowUpWeeks: z.number().optional()
});
export type GrowthInterpretation = z.infer<typeof growthInterpretationSchema>;

// ============================================================================
// Immunization Advisory
// ============================================================================

export const immunizationAdviceSchema = z.object({
	dueNow: z
		.array(
			z.object({
				vaccine: z.string(),
				doseNumber: z.number(),
				reason: z.string()
			})
		)
		.default([]),
	upcoming: z
		.array(
			z.object({
				vaccine: z.string(),
				dueWithinDays: z.number()
			})
		)
		.default([]),
	contraindications: z.array(z.string()).default([]),
	notes: z.string().default("")
});
export type ImmunizationAdvice = z.infer<typeof immunizationAdviceSchema>;

// ============================================================================
// Clinical Follow-up History Checklist
// ============================================================================

export const followUpQuestionsSchema = z.object({
	questions: z
		.array(
			z.object({
				question: z.string().min(1),
				rationale: z.string().min(1)
			})
		)
		.min(1)
});
export type FollowUpQuestions = z.infer<typeof followUpQuestionsSchema>;

// ============================================================================
// Discriminated Results & Meta
// ============================================================================

export interface AiMeta {
	model: string;
	tokensUsed: number;
	durationMs: number;
	taskKind: TaskKind;
}

export type ClinicAiResult =
	| { taskKind: "soap_note"; data: SoapNote; meta: AiMeta }
	| { taskKind: "patient_education"; data: PatientEducation; meta: AiMeta }
	| { taskKind: "differential_dx"; data: DifferentialDx; meta: AiMeta }
	| {
			taskKind: "pediatric_dosing_safety";
			data: PediatricDosingSafety;
			meta: AiMeta;
	  }
	| {
			taskKind: "growth_interpretation";
			data: GrowthInterpretation;
			meta: AiMeta;
	  }
	| { taskKind: "immunization_advice"; data: ImmunizationAdvice; meta: AiMeta }
	| { taskKind: "follow_up_questions"; data: FollowUpQuestions; meta: AiMeta };

export const apiKeyConfigSchema = z.object({
	baseUrl: z.string().url(),
	apiKey: z.string().min(1),
	model: z.string().min(1),
	maxTokens: z.number().int().positive().optional().default(4096)
});
export type ApiKeyConfig = z.infer<typeof apiKeyConfigSchema>;
export type ApiKeyConfigInput = z.input<typeof apiKeyConfigSchema>;

export interface ClinicGenerationInput {
	taskKind: TaskKind;
	apiKeyConfig: ApiKeyConfigInput;
	language?: "ar" | "en";
	readingLevel?: "parents" | "general" | "clinician";
	patient: {
		id: string;
		sex: "male" | "female";
		dateOfBirth: string; // ISO or REDACTED
		ageMonths: number;
		weightKg?: number | null;
		allergies?: string | null;
		birthWeightKg?: number | null;
		birthLengthCm?: number | null;
		gestationalAgeWeeks?: number | null;
	};
	visit?: {
		id: string;
		visitedAt: string;
		chiefComplaint?: string | null;
		symptoms?: string | null;
		physicalExam?: string | null;
		plan?: string | null;
		notes?: string | null;
	};
	measurements?: Array<{
		indicator:
			| "weight-for-age"
			| "length-for-age"
			| "bmi-for-age"
			| "head-circumference-for-age";
		value: number;
		zScore?: number | null;
		measuredAt: string;
	}>;
	immunizations?: Array<{
		vaccineKey: string;
		vaccineName: string;
		doseNumber: number | null;
		status: string;
		dueDate?: string | null;
	}>;
	dosingQuery?: {
		drugName: string;
		proposedDose: string;
		frequency: string;
		durationDays?: number;
		route?: string;
	};
	freeText?: string;
}
