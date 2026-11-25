import { z } from 'zod';

import {
  isoDateSchema,
  optionalText,
  timestampSchema,
  uuidSchema,
} from '../../helpers';

export const IMMUNIZATION_STATUSES = [
  'planned',
  'due',
  'administered',
  'deferred',
  'contraindicated',
  'missed',
  'refused',
] as const;

export type ImmunizationStatus = (typeof IMMUNIZATION_STATUSES)[number];

const immunizationFields = {
  patientId: uuidSchema,
  visitId: uuidSchema.optional().nullable(),
  vaccineId: z.string().min(1).max(100).optional().nullable(),
  vaccineKey: z.string().min(1).max(50),
  vaccineName: z.string().min(1).max(150),
  doseNumber: z.coerce.number().int().min(0).max(10).default(1),
  targetAgeMonths: z.coerce.number().min(0).max(240),
  status: z.enum(IMMUNIZATION_STATUSES).default('planned'),
  administeredDate: timestampSchema.optional().nullable(),
  dueDate: isoDateSchema.optional().nullable(),
  nextDueDate: isoDateSchema.optional().nullable(),
  manufacturer: optionalText(150),
  lotNumber: optionalText(80),
  site: optionalText(80),
  route: optionalText(80),
  administeredById: z.string().optional().nullable(),
  administeredByName: optionalText(150),
  facility: optionalText(200),
  expiryDate: isoDateSchema.optional().nullable(),
  adverseEvents: optionalText(1000),
  notes: optionalText(1000),
  createdBy: z.string().optional().nullable(),
  updatedBy: z.string().optional().nullable(),
};

const validateAdministration = (
  value: { status?: ImmunizationStatus; administeredDate?: Date | null },
  context: z.RefinementCtx,
) => {
  if (value.status === 'administered' && !value.administeredDate) {
    context.addIssue({
      code: 'custom',
      path: ['administeredDate'],
      message: 'An administration date is required for an administered dose',
    });
  }

  if (
    value.status !== undefined &&
    value.status !== 'administered' &&
    value.administeredDate !== undefined &&
    value.administeredDate !== null
  ) {
    context.addIssue({
      code: 'custom',
      path: ['administeredDate'],
      message: 'Only an administered dose can have an administration date',
    });
  }
};

export const immunizationInputSchema = z
  .object(immunizationFields)
  .superRefine(validateAdministration);

export const updateImmunizationInputSchema = z
  .object(immunizationFields)
  .omit({ patientId: true, vaccineKey: true, createdBy: true })
  .partial()
  .superRefine(validateAdministration);

export type ImmunizationInput = z.infer<typeof immunizationInputSchema>;

export type UpdateImmunizationInput = z.infer<
  typeof updateImmunizationInputSchema
>;
