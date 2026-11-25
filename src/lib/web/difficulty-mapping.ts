// apps/web/src/lib/difficulty-mapping.ts

export type TriageAcuityLevel = 1 | 2 | 3 | 4 | 5;

export interface AcuityDescriptor {
  level: TriageAcuityLevel;
  code: string;
  labelEn: string;
  labelAr: string;
}

export const TRIAGE_ACUITY_LEVELS: Record<TriageAcuityLevel, AcuityDescriptor> =
  {
    1: {
      level: 1,
      code: 'WELL',
      labelEn: 'Routine Well-Child',
      labelAr: 'متابعة روتينية',
    },
    2: {
      level: 2,
      code: 'LOW',
      labelEn: 'Mild / Scheduled',
      labelAr: 'حالة بسيطة / مجدولة',
    },
    3: {
      level: 3,
      code: 'MOD',
      labelEn: 'Moderate Outpatient',
      labelAr: 'متابعة متوسطة',
    },
    4: {
      level: 4,
      code: 'URGENT',
      labelEn: 'Urgent Triage',
      labelAr: 'فرز عاجل',
    },
    5: {
      level: 5,
      code: 'STAT',
      labelEn: 'High Acuity / Priority',
      labelAr: 'أولوية قصوى',
    },
  };

export function clampTriageLevel(level: number): TriageAcuityLevel {
  const rounded = Math.round(level);

  if (rounded <= 1) {
    return 1;
  }

  if (rounded === 2) {
    return 2;
  }

  if (rounded === 3) {
    return 3;
  }

  if (rounded === 4) {
    return 4;
  }

  return 5;
}

export function getDifficultyLabel(
  _category: string,
  level: number,
  locale: 'ar' | 'en' = 'en',
): string {
  const clamped = clampTriageLevel(level);
  const entry = TRIAGE_ACUITY_LEVELS[clamped];

  return locale === 'ar' ? entry.labelAr : entry.labelEn;
}
