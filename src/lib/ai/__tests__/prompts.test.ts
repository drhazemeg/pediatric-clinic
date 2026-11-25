import type { ClinicGenerationInput } from '../schemas';

import { describe, expect, it } from 'bun:test';

import { buildSystemPrompt, buildTaskPrompt } from '../prompts';

describe('Pediatric AI Prompt Builders', () => {
  const baseInput: ClinicGenerationInput = {
    taskKind: 'soap_note',
    apiKeyConfig: {
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'test-key',
      model: 'clinical-llm',
    },
    language: 'ar',
    patient: {
      id: 'P1',
      sex: 'male',
      dateOfBirth: 'REDACTED',
      ageMonths: 24,
      allergies: 'None',
      birthWeightKg: 3.2,
      gestationalAgeWeeks: 39,
    },
    visit: {
      id: 'V1',
      visitedAt: 'CURRENT_VISIT',
      chiefComplaint: 'Fever and wheezing',
      symptoms: 'Dry cough, tachypnea',
      physicalExam: 'Bilateral expiratory wheezes, subcostal retractions',
    },
  };

  it('builds pediatric system prompt with clinical rules', () => {
    const sys = buildSystemPrompt(baseInput);
    expect(sys).toContain('Pediatrician');
    expect(sys).toContain('Weight-based');
    expect(sys).toContain('JSON');
  });

  it('builds SOAP note prompt with structured expectations', () => {
    const prompt = buildTaskPrompt(baseInput);
    expect(prompt).toContain('PATIENT CONTEXT');
    expect(prompt).toContain('Fever and wheezing');
    expect(prompt).toContain('subjective');
    expect(prompt).toContain('objective');
    expect(prompt).toContain('assessment');
    expect(prompt).toContain('plan');
  });

  it('builds bilingual parent guidance prompt', () => {
    const parentInput: ClinicGenerationInput = {
      ...baseInput,
      taskKind: 'patient_education',
      language: 'ar',
    };

    const prompt = buildTaskPrompt(parentInput);
    expect(prompt).toContain('Arabic');
    expect(prompt).toContain('homeCareSteps');
    expect(prompt).toContain('dangerSignsToSeekEmergency');
  });

  it('builds pediatric dosing safety prompt', () => {
    const dosingInput: ClinicGenerationInput = {
      ...baseInput,
      taskKind: 'pediatric_dosing_safety',
      patient: {
        ...baseInput.patient,
        weightKg: 12.5,
      },
      dosingQuery: {
        drugName: 'Azithromycin',
        proposedDose: '10 mg/kg once daily',
        frequency: 'q24h',
        durationDays: 3,
      },
    };

    const prompt = buildTaskPrompt(dosingInput);
    expect(prompt).toContain('Azithromycin');
    expect(prompt).toContain('doseUnit');
    expect(prompt).toContain('maxRecommendedDailyDose');
  });

  it('refuses to generate pediatric dosing safety prompt if weight is missing', () => {
    const dosingInputNoWeight: ClinicGenerationInput = {
      ...baseInput,
      taskKind: 'pediatric_dosing_safety',
      patient: {
        ...baseInput.patient,
        weightKg: undefined,
      },
      dosingQuery: {
        drugName: 'Azithromycin',
        proposedDose: '10 mg/kg once daily',
        frequency: 'q24h',
      },
    };

    expect(() => buildTaskPrompt(dosingInputNoWeight)).toThrow(
      'pediatric_dosing_safety requires patient.weightKg',
    );
  });
});
