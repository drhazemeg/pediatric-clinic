// apps/web/src/lib/__tests__/avatar-url.test.ts
import { describe, expect, it } from 'bun:test';

import { images } from '../app-images';
import {
  BACKGROUND_COLORS,
  HAIR_COLORS,
  SKIN_COLORS,
  randomSeed,
  resolveClinicAvatarSrc,
} from '../avatar-url';

describe('randomSeed', () => {
  it('generates a seed of the requested length using allowed characters', () => {
    const seed = randomSeed(12);
    expect(seed).toHaveLength(12);
    expect(seed).toMatch(/^[a-z0-9]+$/u);
  });

  it('defaults to 8 characters', () => {
    expect(randomSeed()).toHaveLength(8);
  });
});

describe('resolveClinicAvatarSrc', () => {
  it('returns customSrc when provided and non-empty', () => {
    expect(resolveClinicAvatarSrc({ customSrc: '/custom-staff.webp' })).toBe(
      '/custom-staff.webp',
    );
  });

  it('falls back to role asset when customSrc is blank or null', () => {
    expect(
      resolveClinicAvatarSrc({ role: 'pediatrician', customSrc: '   ' }),
    ).toBe(images.doctorAvatar.src);
    expect(resolveClinicAvatarSrc({ role: 'ibclc', customSrc: null })).toBe(
      images.doctorAvatar.src,
    );
  });

  it('returns clinic logo for staff or default clinic role', () => {
    expect(resolveClinicAvatarSrc({ role: 'nurse' })).toBe(images.logo.src);
    expect(resolveClinicAvatarSrc({ role: 'reception' })).toBe(images.logo.src);
    expect(resolveClinicAvatarSrc()).toBe(images.logo.src);
  });
});

describe('BACKGROUND_COLORS', () => {
  it('has 8 color options', () => {
    expect(BACKGROUND_COLORS).toHaveLength(8);
  });

  it('each option has label and value', () => {
    for (const c of BACKGROUND_COLORS) {
      expect(c).toHaveProperty('label');
      expect(c).toHaveProperty('value');
    }
  });
});

describe('SKIN_COLORS', () => {
  it('has 5 skin tone options', () => {
    expect(SKIN_COLORS).toHaveLength(5);
  });
});

describe('HAIR_COLORS', () => {
  it('has 7 hair color options', () => {
    expect(HAIR_COLORS).toHaveLength(7);
  });
});
