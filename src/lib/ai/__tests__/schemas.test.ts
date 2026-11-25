import { describe, expect, it } from 'bun:test';

import {
  differentialDxSchema,
  growthInterpretationSchema,
  immunizationAdviceSchema,
  patientEducationSchema,
  pediatricDosingSafetySchema,
  soapNoteSchema,
} from '../schemas';

describe('Pediatric AI Schemas', () => {
  it('validates clinical SOAP note', () => {
    const raw = {
      subjective:
        '3yo male presenting with fever x 2 days, runny nose, reduced oral intake.',
      objective:
        'Temp 38.5C, RR 26, HR 110, SpO2 99%. Pharynx mildly injected. Chest clear.',
      assessment: 'Acute viral upper respiratory tract infection.',
      plan: 'Paracetamol 15 mg/kg for fever. Push oral fluids. Saline nasal spray.',
      icd10Suggestions: [
        {
          code: 'J06.9',
          description: 'Acute upper respiratory infection, unspecified',
          confidence: 0.95,
        },
      ],
      redFlags: [
        'Persistent fever > 3 days',
        'Respiratory distress or grunting',
      ],
    };

    const parsed = soapNoteSchema.parse(raw);
    expect(parsed.subjective).toContain('3yo male');
    expect(parsed.icd10Suggestions[0]?.code).toBe('J06.9');
    expect(parsed.disclaimer).toBeTruthy();
  });

  it('validates bilingual parent education guidance', () => {
    const raw = {
      title: 'إرشادات العناية بالطفل: نزلة البرد',
      summary: 'طفلك مصاب بالتهاب فيروسي بسيط في الجهاز التنفسي العلوي',
      homeCareSteps: [
        'الراحة التامة في بيئة رطبة وجيدة التهوية',
        'غسيل الأنف بمحلول الملح قبل الرضاعة والنوم',
      ],
      feedingAndFluids:
        'الحرص على استمرار الرضاعة الطبيعية وتقديم سوائل دافئة بكميات صغيرة متكررة',
      medicationGuidance: 'باراسيتامول عند اللزوم بجرعة 15 مجم/كجم كل 6 ساعات',
      dangerSignsToSeekEmergency: [
        'سرعة أو صعوبة غير معتادة في التنفس',
        'الخمول الشديد وعدم التجاوب',
        'جفاف الحفاضة لأكثر من 6 ساعات',
      ],
      language: 'ar',
      readingLevel: 'parents',
    };

    const parsed = patientEducationSchema.parse(raw);
    expect(parsed.language).toBe('ar');
    expect(parsed.dangerSignsToSeekEmergency.length).toBe(3);
  });

  it('validates pediatric dosing safety output', () => {
    const raw = {
      drugName: 'Amoxicillin',
      proposedDose: '450 mg PO BID',
      weightKg: 10,
      ageMonths: 18,
      standardDoseRange: '80-90 mg/kg/day divided q12h',
      doseUnit: 'mg/kg/day',
      isDoseWithinRange: true,
      maxRecommendedDailyDose: '2000 mg/day',
      warnings: ['Confirm no beta-lactam anaphylaxis history'],
      clinicalVerdict: 'appropriate',
    };

    const parsed = pediatricDosingSafetySchema.parse(raw);
    expect(parsed.isDoseWithinRange).toBe(true);
    expect(parsed.clinicalVerdict).toBe('appropriate');
  });

  it('validates growth & milestone interpretation', () => {
    const raw = {
      summary:
        'Weight and length are tracking along the 50th percentile (z-score 0.0).',
      weightStatus: 'Appropriate for age',
      heightStatus: 'Appropriate for age',
      falteringGrowthRisk: false,
      concerns: [],
      nutritionalCounseling: [
        'Continue balanced varied diet including iron-rich complementary foods.',
      ],
      anticipatoryMilestones: [
        'Expected to combine 2 words into simple phrases in the next 3 months.',
      ],
    };

    const parsed = growthInterpretationSchema.parse(raw);
    expect(parsed.falteringGrowthRisk).toBe(false);
  });

  it('validates immunization advice', () => {
    const raw = {
      dueNow: [{ vaccine: 'MMR', doseNumber: 1, reason: 'Due at 12 months' }],
      upcoming: [{ vaccine: 'DTP Booster', dueWithinDays: 180 }],
      contraindications: [],
      notes: 'Up to date according to Egyptian MOH schedule.',
    };

    const parsed = immunizationAdviceSchema.parse(raw);
    expect(parsed.dueNow[0]?.vaccine).toBe('MMR');
  });

  it('validates pediatric differential diagnosis', () => {
    const raw = {
      differentials: [
        {
          diagnosis: 'Viral Bronchiolitis',
          icd10: 'J21.9',
          likelihood: 'high',
          supportingFindings: ['Expiratory wheeze', 'Coryza', 'Tachypnea'],
          againstFindings: ['No focal crackles'],
          nextSteps: ['Supportive care, hydration, monitor respiratory effort'],
        },
      ],
      redFlags: ['Apnea in infant <2 months', 'Hypoxemia SpO2 <92%'],
    };

    const parsed = differentialDxSchema.parse(raw);
    expect(parsed.differentials[0]?.likelihood).toBe('high');
  });
});
