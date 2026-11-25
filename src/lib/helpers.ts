// src/features/shared/helpers.ts
//
// Shared validation schemas, date utilities, and helper functions.

import { z } from 'zod';

export const uuidSchema = z.uuid('Must be a valid UUID');

/** Postgres `date` in `YYYY-MM-DD` (matches `date({ mode: "string" })`). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Use YYYY-MM-DD')
  .refine((v) => {
    // Reject impossible dates like 2023-02-30
    const [y = Number.NaN, m = Number.NaN, d = Number.NaN] = v
      .split('-')
      .map(Number);

    const dt = new Date(Date.UTC(y, m - 1, d));

    return (
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d
    );
  }, 'Invalid calendar date');

/** Timestamps (withTimezone, mode: date) accept Date or ISO string. */
export const timestampSchema = z.coerce.date();

/** Optional nullable text — normalizes "" to null for DB storage. */
export const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : (v ?? null)));

export const requiredText = (max = 255, min = 1) =>
  z.string().trim().min(min, 'Required').max(max);

/** Optional positive-ish number used for LMS / scores. */
export const optionalFiniteNumber = z.number().optional().nullable();

export function optionalNumberInRange(min: number, max: number, label: string) {
  return z
    .string()
    .trim()
    .transform((value, ctx): number | undefined => {
      if (value === '') {
        return undefined;
      }

      const parsed = Number(value);

      if (!Number.isFinite(parsed)) {
        ctx.addIssue({
          code: 'custom',
          message: `${label} must be a number`,
        });

        return z.NEVER;
      }

      if (parsed < min || parsed > max) {
        ctx.addIssue({
          code: 'custom',
          message: `${label} must be between ${min} and ${max}`,
        });

        return z.NEVER;
      }

      return parsed;
    });
}

export const patientSexSchema = z.enum(['male', 'female']);

export const appointmentStatusSchema = z.enum([
  'scheduled',
  'completed',
  'cancelled',
  'no-show',
]);

export const measurementIndicatorSchema = z.enum([
  'weight-for-age',
  'length-for-age',
  'weight-for-length',
  'bmi-for-age',
  'head-circumference-for-age',
]);

export const lmsIndicatorSchema = z.enum([
  'weight-for-age',
  'length-for-age',
  'weight-for-length',
  'bmi-for-age',
]);

export const lmsSexSchema = z.enum(['male', 'female']);

export const lmsXAxisSchema = z.enum(['age', 'length']);

export const diagnosisTypeSchema = z.enum(['primary', 'secondary']);

export const auditActionSchema = z.enum(['create', 'update', 'delete', 'view']);
