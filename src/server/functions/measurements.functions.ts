import type { Indicator } from '@/lib/features/development/index';

// src/server/functions/measurements.functions.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { queryCache } from '@/db/cache';
import {
  addMeasurementWithZScore,
  classificationCountsForClinic,
  createMeasurement,
  createMeasurements,
  createMeasurementsForVisit,
  deleteMeasurement,
  getLms,
  getLmsByAge,
  getLmsByLength,
  getLmsInterpolated,
  getMeasurementById,
  insertMeasurementsStandalone,
  latestMeasurementPerIndicator,
  latestPanelForPatient,
  listFlaggedMeasurements,
  listMeasurementsForVisit,
  severeCasesForClinic,
  updateMeasurement,
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

export const getMeasurementFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertMeasurementAccess(data.id);
      const row = await getMeasurementById(data.id);

      if (!row) {
        throw new AppServerError('NOT_FOUND', 'Measurement not found', 404);
      }

      return row;
    } catch (error) {
      return toAppServerError(error, 'Failed to load measurement');
    }
  });

export const listVisitMeasurementsFn = createServerFn({ method: 'GET' })
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

export const listFlaggedMeasurementsFn = createServerFn({ method: 'GET' })
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

export const latestMeasurementPerIndicatorFn = createServerFn({
  method: 'GET',
})
  .middleware([patientAccessMiddleware])
  .validator(z.object({ patientId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertPatientAccess(data.patientId);

      return await latestMeasurementPerIndicator(data.patientId);
    } catch (error) {
      return toAppServerError(error, 'Failed to load latest measurements');
    }
  });

export const latestPatientPanelFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(z.object({ patientId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertPatientAccess(data.patientId);

      return await latestPanelForPatient(data.patientId);
    } catch (error) {
      return toAppServerError(
        error,
        'Failed to load latest patient growth panel',
      );
    }
  });

export const clinicMeasurementClassificationsFn = createServerFn({
  method: 'GET',
})
  .middleware([clinicalStaffMiddleware])
  .validator(z.object({ clinicId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    try {
      context.guard.assertClinicScope(data.clinicId);

      return await classificationCountsForClinic(data.clinicId);
    } catch (error) {
      return toAppServerError(
        error,
        'Failed to load clinic classification counts',
      );
    }
  });

export const clinicSevereGrowthCasesFn = createServerFn({ method: 'GET' })
  .middleware([clinicalStaffMiddleware])
  .validator(z.object({ clinicId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    try {
      context.guard.assertClinicScope(data.clinicId);

      return await severeCasesForClinic(data.clinicId);
    } catch (error) {
      return toAppServerError(
        error,
        'Failed to load severe growth referral queue',
      );
    }
  });

export const lookupLmsFn = createServerFn({ method: 'GET' })
  .middleware([patientAccessMiddleware])
  .validator(
    z.discriminatedUnion('mode', [
      z.object({
        mode: z.literal('by-age'),
        indicator: indicatorSchema,
        sex: sexSchema,
        ageMonths: z.number().min(0),
      }),
      z.object({
        mode: z.literal('by-length'),
        sex: sexSchema,
        lengthCm: z.number().positive(),
      }),
      z.object({
        mode: z.literal('grid'),
        indicator: indicatorSchema,
        sex: sexSchema,
        xAxis: z.enum(['age', 'length']),
        xValue: z.number(),
        interpolated: z.boolean().default(true),
      }),
    ]),
  )
  .handler(async ({ data }) => {
    try {
      if (data.mode === 'by-age') {
        return await getLmsByAge(data.indicator, data.sex, data.ageMonths);
      }

      if (data.mode === 'by-length') {
        return await getLmsByLength(data.sex, data.lengthCm);
      }

      // SAFETY: indicatorSchema is a strict subset of Indicator.
      const params = {
        indicator: data.indicator as Indicator,
        sex: data.sex,
        xAxis: data.xAxis,
        xValue: data.xValue,
      };

      return data.interpolated
        ? await getLmsInterpolated(params)
        : await getLms(params);
    } catch (error) {
      return toAppServerError(error, 'Failed to resolve LMS reference');
    }
  });

export const insertStandaloneMeasurementsFn = createServerFn({ method: 'POST' })
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
      return toAppServerError(
        error,
        'Failed to record standalone measurements',
      );
    }
  });

export const createMeasurementsForVisitFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(
    z.object({
      visitId: z.string().min(1),
      patientId: z.string().min(1),
      rows: z
        .array(
          z.object({
            indicator: indicatorSchema,
            value: z.number().positive(),
            zScore: z.number().optional(),
            percentile: z.number().optional(),
            classification: z.string().optional(),
            lmsL: z.number().optional(),
            lmsM: z.number().optional(),
            lmsS: z.number().optional(),
          }),
        )
        .min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertVisitAccess(data.visitId, {
        expectedPatientId: data.patientId,
      });

      const created = await createMeasurementsForVisit({
        visitId: data.visitId,
        rows: data.rows,
      });

      queryCache.invalidateTag(`growth:patient:${data.patientId}`);

      return created;
    } catch (error) {
      return toAppServerError(error, 'Failed to record visit measurements');
    }
  });

export const addMeasurementWithZScoreFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(
    z.object({
      patientId: z.string().min(1),
      visitId: z.string().min(1),
      indicator: storedIndicatorSchema,
      value: z.number().positive(),
      sex: sexSchema,
      ageMonths: z.number().min(0),
      lengthCm: z.number().positive().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertVisitAccess(data.visitId, {
        expectedPatientId: data.patientId,
      });

      const row = await addMeasurementWithZScore(
        data.visitId,
        data.indicator,
        data.value,
        data.sex,
        data.ageMonths,
        data.lengthCm,
      );

      queryCache.invalidateTag(`growth:patient:${data.patientId}`);

      return row;
    } catch (error) {
      return toAppServerError(error, 'Failed to add measurement with z-score');
    }
  });

export const createMeasurementRawFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(
    z.object({
      visitId: z.string().min(1),
      patientId: z.string().min(1),
      indicator: storedIndicatorSchema,
      value: z.number().positive(),
      zScore: z.number().optional(),
      percentile: z.number().optional(),
      classification: z.string().optional(),
      lmsL: z.number().optional(),
      lmsM: z.number().optional(),
      lmsS: z.number().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.guard.assertVisitAccess(data.visitId, {
        expectedPatientId: data.patientId,
      });
      const row = await createMeasurement(data);
      queryCache.invalidateTag(`growth:patient:${data.patientId}`);

      return row;
    } catch (error) {
      return toAppServerError(error, 'Failed to create measurement');
    }
  });

export const createMeasurementsBatchFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(
    z.object({
      patientId: z.string().min(1),
      rows: z
        .array(
          z.object({
            visitId: z.string().min(1),
            indicator: storedIndicatorSchema,
            value: z.number().positive(),
            zScore: z.number().optional(),
            percentile: z.number().optional(),
            classification: z.string().optional(),
            lmsL: z.number().optional(),
            lmsM: z.number().optional(),
            lmsS: z.number().optional(),
          }),
        )
        .min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      const visitIds = new Set(data.rows.map((r) => r.visitId));
      await Promise.all(
        Array.from(
          visitIds,
          async (visitId) =>
            await context.guard.assertVisitAccess(visitId, {
              expectedPatientId: data.patientId,
            }),
        ),
      );
      const rows = await createMeasurements(data.rows);
      queryCache.invalidateTag(`growth:patient:${data.patientId}`);

      return rows;
    } catch (error) {
      return toAppServerError(error, 'Failed to batch create measurements');
    }
  });

export const updateMeasurementFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(
    z.object({
      id: z.string().min(1),
      patientId: z.string().min(1),
      patch: z.object({
        value: z.number().positive().optional(),
        zScore: z.number().nullable().optional(),
        percentile: z.number().nullable().optional(),
        classification: z.string().nullable().optional(),
        lmsL: z.number().nullable().optional(),
        lmsM: z.number().nullable().optional(),
        lmsS: z.number().nullable().optional(),
      }),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      const existing = await context.guard.assertMeasurementAccess(data.id, {
        expectedPatientId: data.patientId,
      });

      const row = await updateMeasurement(data.id, data.patch);

      if (row === undefined) {
        throw new AppServerError('NOT_FOUND', 'Measurement not found', 404);
      }

      queryCache.invalidateTag(`growth:patient:${existing.patientId}`);

      return row;
    } catch (error) {
      return toAppServerError(error, 'Failed to update measurement');
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
