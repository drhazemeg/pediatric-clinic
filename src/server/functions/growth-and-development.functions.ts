import type { Indicator } from '@/lib/features/development/index';

// src/server/functions/growth-and-development.functions.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { queryCache } from '@/db/cache';
import {
  bulkSetPatientMilestones,
  getPatientDevelopmentSnapshot,
  setPatientMilestone,
} from '@/db/queries/develop.queries';
import {
  fetchChildMeasurements,
  getGrowthChartBand,
  getGrowthChartCurves,
  indicatorTrend,
  listIndicatorSeries,
} from '@/db/queries/growth.queries';
import {
  addMeasurementWithZScore,
  deleteMeasurement,
  insertMeasurementsStandalone,
  listFlaggedMeasurements,
  listMeasurementsForVisit,
} from '@/db/queries/measurements.queries';

import { AppServerError, toAppServerError } from '../fn-errors';
import {
  adminOnlyMiddleware,
  clinicalStaffMiddleware,
  patientAccessMiddleware,
} from '../fn-middleware';

const sexSchema = z.enum(['male', 'female']);

const indicatorSchema = z.enum([
  'weight-for-age',
  'length-for-age',
  'weight-for-length',
  'bmi-for-age',
]);

const storedIndicatorSchema = z.enum([
  'weight-for-age',
  'length-for-age',
  'weight-for-length',
  'bmi-for-age',
  'head-circumference-for-age',
]);

export const getGrowthCurvesFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(
    z.discriminatedUnion('xAxis', [
      z.object({
        indicator: z.literal('weight-for-length'),
        sex: sexSchema,
        xAxis: z.literal('length'),
        min: z.number(),
        max: z.number(),
      }),
      z.object({
        indicator: z.enum([
          'weight-for-age',
          'length-for-age',
          'bmi-for-age',
          'head-circumference-for-age',
        ]),
        sex: sexSchema,
        xAxis: z.literal('age'),
        min: z.number(),
        max: z.number(),
      }),
    ]),
  )
  .handler(async ({ data }) => {
    try {
      const { indicator, sex, ...range } = data;

      if (range.xAxis === 'length') {
        return await getGrowthChartCurves(indicator, sex, {
          xAxis: 'length',
          min: range.min,
          max: range.max,
        });
      }

      return await getGrowthChartCurves(indicator, sex, {
        xAxis: 'age',
        min: range.min,
        max: range.max,
      });
    } catch (error) {
      return toAppServerError(error, 'Failed to load growth reference curves');
    }
  });

export const getGrowthBandAtPointFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(
    z.object({
      indicator: indicatorSchema,
      sex: sexSchema,
      xAxis: z.enum(['age', 'length']),
      min: z.number(),
      max: z.number(),
      x: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await getGrowthChartBand(
        data.indicator,
        data.sex,
        { xAxis: data.xAxis, min: data.min, max: data.max },
        data.x,
      );
    } catch (error) {
      return toAppServerError(error, 'Failed to interpolate growth band');
    }
  });

export const getPatientGrowthSeriesFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(
    z.object({
      patientId: z.string().min(1),
      indicator: indicatorSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertPatientAccess(data.patientId);

      const [series, trend] = await Promise.all([
        listIndicatorSeries(data.patientId, data.indicator),
        indicatorTrend(data.patientId, data.indicator),
      ]);

      return { series, trend };
    } catch (error) {
      return toAppServerError(error, 'Failed to load patient growth series');
    }
  });

export const latestPatientPanelFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(z.object({ patientId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertPatientAccess(data.patientId);

      const indicators: Array<Indicator> = [
        'weight-for-age',
        'length-for-age',
        'weight-for-length',
        'bmi-for-age',
      ];

      const series = await Promise.all(
        indicators.map(
          async (indicator) =>
            await listIndicatorSeries(data.patientId, indicator),
        ),
      );

      return Object.fromEntries(
        indicators.map((indicator, index) => {
          const points = series[index];

          return [indicator, points.at(-1) ?? null];
        }),
      );
    } catch (error) {
      return toAppServerError(error, 'Failed to load latest patient panel');
    }
  });

export const getChildDailyMeasurementsFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(
    z.object({
      patientId: z.string().min(1),
      metric: z.enum(['lhfa', 'wfa']),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertPatientAccess(data.patientId);

      return await fetchChildMeasurements(data.patientId, data.metric);
    } catch (error) {
      return toAppServerError(error, 'Failed to load child daily measurements');
    }
  });

export const getVisitMeasurementsFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(z.object({ visitId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertVisitAccess(data.visitId);

      return await listMeasurementsForVisit(data.visitId);
    } catch (error) {
      return toAppServerError(error, 'Failed to load visit measurements');
    }
  });

export const getFlaggedMeasurementsFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(
    z.object({
      patientId: z.string().min(1),
      zThreshold: z.number().positive().default(2),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertPatientAccess(data.patientId);

      return await listFlaggedMeasurements(data.patientId, data.zThreshold);
    } catch (error) {
      return toAppServerError(error, 'Failed to load flagged measurements');
    }
  });

export const createStandaloneMeasurementsFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(
    z.object({
      patientId: z.string().min(1),
      clinicId: z.string().min(1),
      rows: z
        .array(
          z.object({
            indicator: indicatorSchema,
            value: z.number().positive(),
            lengthCm: z.number().positive().nullable().optional(),
          }),
        )
        .min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      context.guard.assertClinicScope(data.clinicId);
      await context.guard.assertPatientAccess(data.patientId, {
        expectedClinicId: data.clinicId,
      });
      const created = await insertMeasurementsStandalone(data);
      queryCache.invalidateTag(`growth:patient:${data.patientId}`);

      return created;
    } catch (error) {
      return toAppServerError(error, 'Failed to save standalone measurements');
    }
  });

export const addVisitMeasurementWithZScoreFn = createServerFn({
  method: 'POST',
})
  .middleware([clinicalStaffMiddleware])
  .validator(
    z.object({
      patientId: z.string().min(1),
      visitId: z.string().min(1),
      indicator: storedIndicatorSchema,
      value: z.number().positive(),
      sex: sexSchema,
      ageMonths: z.number().nonnegative(),
      lengthCm: z.number().positive().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertVisitAccess(data.visitId, {
        expectedPatientId: data.patientId,
      });

      const created = await addMeasurementWithZScore(
        data.visitId,
        data.indicator,
        data.value,
        data.sex,
        data.ageMonths,
        data.lengthCm,
      );

      queryCache.invalidateTag(`growth:patient:${data.patientId}`);

      return created;
    } catch (error) {
      return toAppServerError(error, 'Failed to add measurement with z-score');
    }
  });

export const deleteMeasurementFn = createServerFn({ method: 'POST' })
  .middleware([adminOnlyMiddleware])
  .validator(
    z.object({
      id: z.string().min(1),
      patientId: z.string().min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      const existing = await context.guard.assertMeasurementAccess(data.id, {
        expectedPatientId: data.patientId,
      });

      await deleteMeasurement(data.id);
      queryCache.invalidateTag(`growth:patient:${existing.patientId}`);

      return { deleted: true as const, id: data.id };
    } catch (error) {
      return toAppServerError(error, 'Failed to delete measurement');
    }
  });

// --- Developmental Milestones ---

export const getDevelopmentSnapshotFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(
    z.object({
      patientId: z.string().min(1),
      asOfIso: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertPatientAccess(data.patientId);

      const snapshot = await getPatientDevelopmentSnapshot(
        data.patientId,
        data.asOfIso !== undefined && data.asOfIso !== ''
          ? new Date(data.asOfIso)
          : new Date(),
      );

      if (!snapshot) {
        throw new AppServerError('NOT_FOUND', 'Patient not found', 404);
      }

      return snapshot;
    } catch (error) {
      return toAppServerError(error, 'Failed to load development snapshot');
    }
  });

export const setMilestoneFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(
    z.object({
      patientId: z.string().min(1),
      milestoneId: z.string().min(1),
      isAchieved: z.boolean(),
      achievedDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/u)
        .nullable()
        .optional(),
      notes: z.string().max(1000).nullable().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertPatientAccess(data.patientId);

      const row = await setPatientMilestone({
        ...data,
        actorId: context.user.id,
      });

      queryCache.invalidateTag(`development:patient:${data.patientId}`);

      return row;
    } catch (error) {
      return toAppServerError(error, 'Failed to update milestone');
    }
  });

export const bulkSetMilestonesFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(
    z.object({
      patientId: z.string().min(1),
      items: z
        .array(
          z.object({
            milestoneId: z.string().min(1),
            isAchieved: z.boolean(),
            achievedDate: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/u)
              .nullable()
              .optional(),
          }),
        )
        .min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertPatientAccess(data.patientId);

      const rows = await bulkSetPatientMilestones(
        data.patientId,
        data.items,
        context.user.id,
      );

      queryCache.invalidateTag(`development:patient:${data.patientId}`);

      return rows;
    } catch (error) {
      return toAppServerError(error, 'Failed to bulk update milestones');
    }
  });
