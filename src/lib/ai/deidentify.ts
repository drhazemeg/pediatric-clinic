import type { ClinicGenerationInput } from './schemas';

/**
 * Regex patterns for identifying potential Protected Health Information (PHI).
 */
const PHONE_REGEX =
  /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gu;

const EGYPT_PHONE_REGEX = /\b(?:01[0125]\d{8})\b/gu;

// Egyptian 14-digit national ID
const NATIONAL_ID_REGEX = /\b\d{14}\b/gu;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/gu;
const MRN_REGEX = /\b(?:MRN|mrn|REC|rec|ID|id)[:\s#]*[A-Za-z0-9-]{4,15}\b/gu;

/**
 * Sanitize raw clinician free-text notes by stripping potential phone numbers,
 * emails, national IDs, and obvious MRN labels.
 */
export function sanitizeClinicalText(text?: string | null): string {
  if (text === undefined || text === null || text === '') {
    return '';
  }

  return text
    .replaceAll(EMAIL_REGEX, '[EMAIL_REDACTED]')
    .replaceAll(NATIONAL_ID_REGEX, '[NAT_ID_REDACTED]')
    .replaceAll(EGYPT_PHONE_REGEX, '[PHONE_REDACTED]')
    .replaceAll(PHONE_REGEX, '[PHONE_REDACTED]')
    .replaceAll(MRN_REGEX, '[MRN_REDACTED]');
}

/**
 * Format age in months into safe, human-readable clinical age description
 * without disclosing exact date of birth.
 */
export function formatSafeAge(ageMonths: number): string {
  if (ageMonths < 1) {
    const days = Math.max(1, Math.round(ageMonths * 30));

    return `${days} days (neonate/early infant)`;
  }

  if (ageMonths < 24) {
    const months = Math.floor(ageMonths);

    return `${months} months`;
  }

  const years = Math.floor(ageMonths / 12);
  const remMonths = Math.round(ageMonths % 12);

  return remMonths > 0
    ? `${years} years ${remMonths} months`
    : `${years} years`;
}

/**
 * De-identify clinic data before sending to any LLM.
 * Strictly adheres to AGENTS.md Section 10:
 * "Never send identifiable patient data to external LLMs, analytics, telemetry, or AI APIs."
 *
 * Replaces exact dates with relative age in months, scrubs patient and doctor IDs,
 * strips phone numbers, and redacts free-text notes.
 */
export function deidentifyClinicData(
  input: ClinicGenerationInput,
): ClinicGenerationInput {
  return {
    taskKind: input.taskKind,
    apiKeyConfig: input.apiKeyConfig,
    language: input.language ?? 'ar',
    readingLevel: input.readingLevel ?? 'parents',
    patient: {
      id: 'ANONYMIZED_PATIENT',
      sex: input.patient.sex,
      dateOfBirth: 'REDACTED',
      ageMonths: input.patient.ageMonths,
      allergies: sanitizeClinicalText(input.patient.allergies),
      birthWeightKg: input.patient.birthWeightKg,
      birthLengthCm: input.patient.birthLengthCm,
      gestationalAgeWeeks: input.patient.gestationalAgeWeeks,
    },
    visit: input.visit
      ? {
          id: 'ANONYMIZED_VISIT',
          visitedAt: input.visit.visitedAt ? 'VISIT_DATE' : 'CURRENT_VISIT',
          chiefComplaint: sanitizeClinicalText(input.visit.chiefComplaint),
          symptoms: sanitizeClinicalText(input.visit.symptoms),
          physicalExam: sanitizeClinicalText(input.visit.physicalExam),
          plan: sanitizeClinicalText(input.visit.plan),
          notes: sanitizeClinicalText(input.visit.notes),
        }
      : undefined,
    measurements: input.measurements?.map((m) => ({
      indicator: m.indicator,
      value: m.value,
      zScore: m.zScore,
      measuredAt: 'RECORDED_DATE',
    })),
    immunizations: input.immunizations?.map((i) => ({
      vaccineKey: i.vaccineKey,
      vaccineName: i.vaccineName,
      doseNumber: i.doseNumber,
      status: i.status,
      dueDate:
        i.dueDate !== undefined && i.dueDate !== null && i.dueDate !== ''
          ? 'SCHEDULED'
          : undefined,
    })),
    freeText: sanitizeClinicalText(input.freeText),
  };
}
