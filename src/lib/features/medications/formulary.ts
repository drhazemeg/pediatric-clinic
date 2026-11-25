import { z } from 'zod';

export type AWaReClassification =
  | 'Access'
  | 'Watch'
  | 'Reserve'
  | 'Not Applicable';

export type FormularyRoute =
  | 'Oral'
  | 'IV'
  | 'IM'
  | 'SC'
  | 'Inhalation'
  | 'Ophthalmic'
  | 'Topical'
  | 'Rectal'
  | 'Subcutaneous'
  | 'Nasal'
  | 'Intratracheal'
  | 'Otic';

export type DoseUnitType =
  | 'mg/kg/dose'
  | 'mg/kg/day'
  | 'mcg/kg/dose'
  | 'mcg/kg/day'
  | 'fixed_mg'
  | 'fixed_mcg'
  | 'g/day'
  | 'drops'
  | 'puffs';

export type PregnancyCategoryType =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'X'
  | 'Not Assigned';

export interface CommercialProductPresentation {
  id: string;
  // e.g. "Oral Suspension", "Vial", "Tablet", "Oral Drops", "Dry Powder Inhaler"
  form: string;
  // e.g. "312.5 mg / 5 mL", "1000 mg", "100 mg / 1 mL"
  strength: string;
  // active mg per unit volume (e.g. 250 mg)
  concentrationMg?: number;
  // unit volume (e.g. 5 mL)
  volumeMl?: number;
  route: FormularyRoute;
  // e.g. ["Augmentin", "Curam", "Megamox", "Hibiotic"]
  commercialBrandsEgypt?: Array<string>;
  isDefault?: boolean;
}

export interface PediatricDosingRule {
  standardDosePerKg?: number;
  doseUnit: DoseUnitType;
  // e.g., "q8h", "q12h", "q24h", "PRN"
  frequency: string;
  // e.g., 3 for q8h, 2 for q12h
  dosesPerDay: number;
  minDosePerKg?: number;
  maxDosePerKg?: number;
  maxSingleDoseMg?: number;
  maxDailyDoseMg?: number;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  guidelines: string;
}

export interface AdultDosingRule {
  standardDose: string;
  maxDailyDose?: string;
  frequency: string;
  guidelines: string;
}

export interface RenalDoseAdjustment {
  // e.g. "CrCl >= 50 mL/min: No adjustment"
  crClNormal?: string;
  // e.g. "CrCl 10-50 mL/min: 50% of dose or q12-24h"
  crClMildToModerate?: string;
  // e.g. "CrCl < 10 mL/min: 25% of dose or q24-48h"
  crClSevere?: string;
  // e.g. "Dose after hemodialysis"
  dialysis?: string;
}

export interface PreparationAndInfusion {
  // e.g. "SWFI, 0.9% NaCl"
  reconstitutionDiluent?: string;
  reconstitutionVolumeMl?: number;
  // e.g. "0.5 to 5 mg/mL in D5W or NS"
  finalInfusionConcentration?: string;
  // e.g. "Infuse over 30 to 60 minutes"
  infusionRate?: string;
  // e.g. "Stable for 24h at room temp"
  stability?: string;
}

export interface DrugMonograph {
  id: string;
  genericName: string;
  brandNamesEgypt: Array<string>;
  pharmacologicalCategory: string;
  atcCode: string;
  awareClassification?: AWaReClassification;
  indications: Array<string>;
  // e.g. ["fever", "cough", "earache", "diarrhea", "vomiting", "wheezing"]
  clinicalSymptoms: Array<string>;
  presentations: Array<CommercialProductPresentation>;
  routes: Array<FormularyRoute>;
  pediatricDosing: PediatricDosingRule;
  adultDosing: AdultDosingRule;
  renalAdjustment: RenalDoseAdjustment;
  hepaticAdjustment: string;
  // e.g., "Administer with food", "Take on empty stomach 1h before meal"
  foodCorrelation: string;
  preparationAndInfusion?: PreparationAndInfusion;
  contraindications: Array<string>;
  blackBoxWarnings?: Array<string>;
  majorAdverseReactions: Array<string>;
  pregnancyCategory: PregnancyCategoryType;
  lactation: string;
  // Avoid combination
  riskXInteractions: Array<string>;
  // Consider therapy modification
  riskDInteractions: Array<string>;
  monitoringParameters: Array<string>;
  g6pdWarning?: boolean;
  penicillinAllergyCrossReactive?: boolean;
}

// Zod Validation Schemas
export const CommercialProductPresentationSchema = z.object({
  id: z.string(),
  form: z.string(),
  strength: z.string(),
  concentrationMg: z.number().optional(),
  volumeMl: z.number().optional(),
  route: z.enum([
    'Oral',
    'IV',
    'IM',
    'SC',
    'Inhalation',
    'Ophthalmic',
    'Topical',
    'Rectal',
    'Subcutaneous',
    'Nasal',
    'Intratracheal',
    'Otic',
  ]),
  commercialBrandsEgypt: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export const PediatricDosingRuleSchema = z.object({
  standardDosePerKg: z.number().optional(),
  doseUnit: z.enum([
    'mg/kg/dose',
    'mg/kg/day',
    'mcg/kg/dose',
    'mcg/kg/day',
    'fixed_mg',
    'fixed_mcg',
    'g/day',
    'drops',
    'puffs',
  ]),
  frequency: z.string(),
  dosesPerDay: z.number(),
  minDosePerKg: z.number().optional(),
  maxDosePerKg: z.number().optional(),
  maxSingleDoseMg: z.number().optional(),
  maxDailyDoseMg: z.number().optional(),
  minAgeMonths: z.number().optional(),
  maxAgeMonths: z.number().optional(),
  guidelines: z.string(),
});

export const AdultDosingRuleSchema = z.object({
  standardDose: z.string(),
  maxDailyDose: z.string().optional(),
  frequency: z.string(),
  guidelines: z.string(),
});

export const RenalDoseAdjustmentSchema = z.object({
  crClNormal: z.string().optional(),
  crClMildToModerate: z.string().optional(),
  crClSevere: z.string().optional(),
  dialysis: z.string().optional(),
});

export const PreparationAndInfusionSchema = z.object({
  reconstitutionDiluent: z.string().optional(),
  reconstitutionVolumeMl: z.number().optional(),
  finalInfusionConcentration: z.string().optional(),
  infusionRate: z.string().optional(),
  stability: z.string().optional(),
});

export const DrugMonographSchema = z.object({
  id: z.string(),
  genericName: z.string(),
  brandNamesEgypt: z.array(z.string()),
  pharmacologicalCategory: z.string(),
  atcCode: z.string(),
  awareClassification: z
    .enum(['Access', 'Watch', 'Reserve', 'Not Applicable'])
    .optional(),
  indications: z.array(z.string()),
  clinicalSymptoms: z.array(z.string()),
  presentations: z.array(CommercialProductPresentationSchema),
  routes: z.array(
    z.enum([
      'Oral',
      'IV',
      'IM',
      'SC',
      'Inhalation',
      'Ophthalmic',
      'Topical',
      'Rectal',
      'Subcutaneous',
      'Nasal',
      'Intratracheal',
      'Otic',
    ]),
  ),
  pediatricDosing: PediatricDosingRuleSchema,
  adultDosing: AdultDosingRuleSchema,
  renalAdjustment: RenalDoseAdjustmentSchema,
  hepaticAdjustment: z.string(),
  foodCorrelation: z.string(),
  preparationAndInfusion: PreparationAndInfusionSchema.optional(),
  contraindications: z.array(z.string()),
  blackBoxWarnings: z.array(z.string()).optional(),
  majorAdverseReactions: z.array(z.string()),
  pregnancyCategory: z.enum(['A', 'B', 'C', 'D', 'X', 'Not Assigned']),
  lactation: z.string(),
  riskXInteractions: z.array(z.string()),
  riskDInteractions: z.array(z.string()),
  monitoringParameters: z.array(z.string()),
  g6pdWarning: z.boolean().optional(),
  penicillinAllergyCrossReactive: z.boolean().optional(),
});

export type DrugMonographValidated = z.infer<typeof DrugMonographSchema>;
