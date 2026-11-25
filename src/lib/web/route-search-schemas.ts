// apps/web/src/lib/route-search-schemas.ts
import { z } from 'zod';

export const clinicLocaleSchema = z
  .enum(['ar', 'en'])
  .catch('ar')
  .default('ar');

export const publicSearchSchema = z.object({
  lang: clinicLocaleSchema,
});

export const authSearchSchema = z.object({
  lang: clinicLocaleSchema,
  redirectTo: z.string().optional(),
});

export const patientsSearchSchema = z.object({
  search: z.string().optional(),
  sex: z.enum(['all', 'male', 'female']).catch('all').default('all'),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

export const patientChartSearchSchema = z.object({
  tab: z
    .enum(['visits', 'growth', 'immunizations', 'guardians'])
    .catch('visits')
    .default('visits'),
  indicator: z
    .enum([
      'weight-for-age',
      'length-for-age',
      'head-circumference-for-age',
      'bmi-for-age',
    ])
    .catch('weight-for-age')
    .default('weight-for-age'),
});

export const appointmentsSearchSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .optional(),
  status: z
    .enum(['all', 'scheduled', 'checked_in', 'completed', 'cancelled'])
    .catch('all')
    .default('all'),
  doctorId: z.string().optional(),
});

export const prescriptionsSearchSchema = z.object({
  patientId: z.string().optional(),
  visitId: z.string().optional(),
  weightKg: z.coerce.number().positive().max(120).optional(),
  tab: z
    .enum(['calculator', 'formulary', 'history'])
    .catch('calculator')
    .default('calculator'),
});

export const growthSearchSchema = z.object({
  indicator: z
    .enum([
      'weight-for-age',
      'length-for-age',
      'bmi-for-age',
      'head-circumference-for-age',
    ])
    .catch('weight-for-age')
    .default('weight-for-age'),
  standard: z.enum(['who', 'egypt']).catch('who').default('who'),
  sex: z.enum(['male', 'female']).catch('male').default('male'),
  maxMonths: z.enum(['12', '24', '60']).catch('24').default('24'),
});

export const immunizationsSearchSchema = z.object({
  tab: z.enum(['schedule', 'matrix']).catch('schedule').default('schedule'),
  ageBracket: z
    .enum(['all', '0-6', '6-12', '12-24', '>24'])
    .catch('all')
    .default('all'),
  onlyOverdue: z.boolean().catch(false).default(false),
});

export const financeSearchSchema = z.object({
  tab: z
    .enum(['overview', 'revenue', 'expenses', 'cashflow'])
    .catch('overview')
    .default('overview'),
  kind: z.enum(['all', 'revenue', 'expense']).catch('all').default('all'),
  category: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  preset: z
    .enum(['7d', '30d', '90d', 'ytd', 'all'])
    .catch('30d')
    .default('30d'),
});

export const jobsSearchSchema = z.object({
  kind: z.string().optional(),
  status: z
    .enum(['all', 'pending', 'running', 'completed', 'failed', 'cancelled'])
    .catch('all')
    .default('all'),
});

export type PublicSearchParams = z.infer<typeof publicSearchSchema>;

export type AuthSearchParams = z.infer<typeof authSearchSchema>;

export type PatientsSearchParams = z.infer<typeof patientsSearchSchema>;

export type PatientChartSearchParams = z.infer<typeof patientChartSearchSchema>;

export type AppointmentsSearchParams = z.infer<typeof appointmentsSearchSchema>;

export type PrescriptionsSearchParams = z.infer<
  typeof prescriptionsSearchSchema
>;

export type GrowthSearchParams = z.infer<typeof growthSearchSchema>;

export type ImmunizationsSearchParams = z.infer<
  typeof immunizationsSearchSchema
>;

export type FinanceSearchParams = z.infer<typeof financeSearchSchema>;

export type JobsSearchParams = z.infer<typeof jobsSearchSchema>;
