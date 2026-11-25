// apps/web/src/lib/__tests__/generate-constants.test.ts
import { describe, expect, it } from 'bun:test';

import {
  AGE_GROUPS,
  CLINICAL_FORMATS,
  CLINICAL_SECTIONS,
  CLINICAL_TOPICS,
  CLINIC_SERVICES,
  FOLLOW_UP_INTERVAL_PRESETS,
} from '../generate-constants';

describe('CLINIC_SERVICES', () => {
  it('has 6 clinical service types', () => {
    expect(CLINIC_SERVICES).toHaveLength(6);
  });

  it('each entry has id, nameEn, nameAr, and icon', () => {
    for (const service of CLINIC_SERVICES) {
      expect(service).toHaveProperty('id');
      expect(service).toHaveProperty('nameEn');
      expect(service).toHaveProperty('nameAr');
      expect(service).toHaveProperty('icon');
    }
  });

  it('has no duplicate IDs', () => {
    const ids = CLINIC_SERVICES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('CLINICAL_SECTIONS', () => {
  it('has 4 clinical encounter sections', () => {
    expect(CLINICAL_SECTIONS).toHaveLength(4);

    for (const section of CLINICAL_SECTIONS) {
      expect(section).toHaveProperty('id');
      expect(section).toHaveProperty('nameEn');
      expect(section).toHaveProperty('nameAr');
      expect(section).toHaveProperty('icon');
      expect(Array.isArray(section.allowedServices)).toBe(true);
    }
  });

  it('SOAP_ENCOUNTER is allowed across all clinic services', () => {
    const soap = CLINICAL_SECTIONS.find((s) => s.id === 'SOAP_ENCOUNTER');
    expect(soap).toBeDefined();

    for (const service of CLINIC_SERVICES) {
      expect(soap?.allowedServices).toContain(service.id);
    }
  });
});

describe('CLINICAL_FORMATS', () => {
  it('has templates with id, nameEn, nameAr, and allowedServices', () => {
    expect(CLINICAL_FORMATS.length).toBeGreaterThan(0);

    for (const format of CLINICAL_FORMATS) {
      expect(format).toHaveProperty('id');
      expect(format).toHaveProperty('nameEn');
      expect(format).toHaveProperty('nameAr');
      expect(Array.isArray(format.allowedServices)).toBe(true);
    }
  });

  it('has no duplicate format IDs', () => {
    const ids = CLINICAL_FORMATS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('CLINICAL_TOPICS', () => {
  it('contains pediatric and neonatal clinical care topics', () => {
    expect(CLINICAL_TOPICS.length).toBeGreaterThan(0);
    expect(CLINICAL_TOPICS).toContain('Neonatal Jaundice');
    expect(CLINICAL_TOPICS).toContain('Catch-Up Vaccination');
  });
});

describe('AGE_GROUPS and FOLLOW_UP_INTERVAL_PRESETS', () => {
  it('defines standard pediatric age groups', () => {
    expect(AGE_GROUPS).toContain('Neonate (0–28d)');
    expect(AGE_GROUPS).toContain('Infant (1–12m)');
  });

  it('defines presets with value, labelEn, and labelAr', () => {
    expect(FOLLOW_UP_INTERVAL_PRESETS.length).toBe(4);

    for (const preset of FOLLOW_UP_INTERVAL_PRESETS) {
      expect(preset.value).toBeGreaterThan(0);
      expect(preset.labelEn.length).toBeGreaterThan(0);
      expect(preset.labelAr.length).toBeGreaterThan(0);
    }
  });
});
