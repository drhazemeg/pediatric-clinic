/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Clinical Medication & Dosage Calculation Types
 * Designed for neonatal intensive care (NICU) and pediatric outpatient/inpatient therapy.
 */

export type DrugCategory =
  | 'Antibiotic'
  | 'Cardiovascular'
  | 'Antipyretic/Analgesic'
  | 'Emergency/Resuscitation'
  | 'Anticonvulsant'
  | 'Cardiovascular/Diuretic'
  | 'Respiratory'
  | 'Gastrointestinal';

export type DoseUnit =
  | 'mg/kg/dose'
  | 'mg/kg/day'
  | 'mcg/kg/dose'
  | 'mcg/kg/min';

export type DrugRoute = 'IV' | 'IM' | 'Oral' | 'Inhalation' | 'PR';

export interface DrugConcentration {
  id: string;
  // e.g. "Oral Suspension 120 mg / 5 mL"
  label: string;
  // e.g. 120
  mg: number;
  // e.g. 5
  ml: number;
  route: DrugRoute;
  isDefault?: boolean;
}

export interface DrugFormularyItem {
  id: string;
  name: string;
  genericName: string;
  category: DrugCategory;
  indication: string;
  // Default recommended dose in doseUnit
  standardDose: number;
  minDose: number;
  maxDose: number;
  doseUnit: DoseUnit;
  // e.g., "q8h (every 8 hours)"
  frequency: string;
  // Number of divided doses per day (e.g., 3 for q8h, 1 for q24h)
  dosesPerDay: number;
  routes: Array<DrugRoute>;
  maxSingleDoseMg?: number;
  maxDailyDoseMg?: number;
  concentrations: Array<DrugConcentration>;
  dilutionGuideline?: string;
  infusionRate?: string;
  safetyWarnings: {
    renalAdjustment?: string;
    hepaticAdjustment?: string;
    neonatalContraindications?: string;
    monitoringNotes?: string;
  };
}

export type DoseSemanticsKind = 'per_dose' | 'per_day' | 'per_minute' | 'fixed';

export type DoseSemantics =
  | { kind: 'per_dose'; rawSingleMg: number; rawDailyMg: number }
  | { kind: 'per_day'; rawSingleMg: number; rawDailyMg: number }
  | { kind: 'per_minute'; rawSingleMg: number; rawDailyMg: number }
  | { kind: 'fixed'; rawSingleMg: number; rawDailyMg: number };

export interface CalculatedDosageResult {
  weightKg: number;
  selectedDose: number;
  doseUnit: DoseUnit;
  singleDoseMg: number;
  dailyDoseMg: number;
  isCappedBySingleLimit: boolean;
  isCappedByDailyLimit: boolean;
  cappedBy: 'single' | 'daily' | 'both' | null;
  cappedSingleDoseMg?: number;
  cappedDailyDoseMg?: number;
  requiresConcentrationConfirmation?: boolean;
  liquidVolumeMl?: number;
  selectedConcentration?: DrugConcentration;
  prescriptionText: string;
}
