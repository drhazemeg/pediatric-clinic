import { z } from 'zod';

export const createPrescriptionInputSchema = z.object({
  visitId: z.string().min(1),
  patientId: z.string().min(1),
  prescribedById: z.string().min(1).nullable().optional(),
  medicationName: z.string().trim().min(1).max(200),
  dosage: z.string().trim().min(1).max(120),
  frequency: z.string().trim().min(1).max(120),
  durationDays: z.number().int().positive().max(365).nullable().optional(),
  instructions: z.string().trim().max(1000).nullable().optional(),
  // Guardrail: require known patient weight when prescribing weight-sensitive meds.
  patientWeightKgAtOrder: z.number().positive().nullable().optional(),
});
