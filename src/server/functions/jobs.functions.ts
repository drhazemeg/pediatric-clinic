import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { and, db, desc, eq } from '@/db';
import { backgroundJob } from '@/db/schema';
import { cancelClinicJob } from '@/server/queue';

import { AppServerError, toAppServerError } from '../fn-errors';
import { clinicalStaffMiddleware } from '../fn-middleware';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | Array<JsonValue>
  | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const toJsonValue = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Drizzle jsonb columns expose unknown at boundary
  value: unknown,
): JsonValue => jsonValueSchema.parse(value);

const getCancelFailureMessage = (
  reason: 'not_found' | 'forbidden' | 'not_cancellable',
): string => {
  if (reason === 'not_found') {
    return 'Job not found';
  }

  if (reason === 'forbidden') {
    return 'You cannot cancel this job';
  }

  return 'This job can no longer be cancelled';
};

export const getClinicJobFn = createServerFn({ method: 'GET' })
  .middleware([clinicalStaffMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context }) => {
    try {
      const rows = await db
        .select({
          id: backgroundJob.id,
          kind: backgroundJob.kind,
          status: backgroundJob.status,
          progress: backgroundJob.progress,
          progressMessage: backgroundJob.progressMessage,
          errorMessage: backgroundJob.errorMessage,
          resultJson: backgroundJob.resultJson,
          logs: backgroundJob.logs,
          tokensUsed: backgroundJob.tokensUsed,
          durationMs: backgroundJob.durationMs,
          createdAt: backgroundJob.createdAt,
          updatedAt: backgroundJob.updatedAt,
          completedAt: backgroundJob.completedAt,
        })
        .from(backgroundJob)
        .where(
          and(
            eq(backgroundJob.id, data.id),
            eq(backgroundJob.userId, context.user.id),
          ),
        )
        .limit(1);

      const row = rows.at(0);

      if (row === undefined) {
        throw new AppServerError('NOT_FOUND', 'Job not found', 404);
      }

      const resultJson =
        row.resultJson === null ? null : toJsonValue(row.resultJson);

      const logs = toJsonValue(row.logs);

      if (!Array.isArray(logs)) {
        throw new AppServerError(
          'INTERNAL_SERVER_ERROR',
          'Job logs have an invalid format',
          500,
        );
      }

      return {
        ...row,
        resultJson,
        logs,
      };
    } catch (error) {
      return toAppServerError(error, 'Failed to load job status');
    }
  });

export const listJobsFn = createServerFn({ method: 'GET' })
  .middleware([clinicalStaffMiddleware])
  .validator(
    z.object({
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
      status: z
        .enum([
          'queued',
          'running',
          'completed',
          'completed_partial',
          'failed',
          'cancelled',
        ])
        .optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      const where = data.status
        ? and(
            eq(backgroundJob.userId, context.user.id),
            eq(backgroundJob.status, data.status),
          )
        : eq(backgroundJob.userId, context.user.id);

      const rows = await db
        .select({
          id: backgroundJob.id,
          kind: backgroundJob.kind,
          status: backgroundJob.status,
          progress: backgroundJob.progress,
          progressMessage: backgroundJob.progressMessage,
          createdAt: backgroundJob.createdAt,
          updatedAt: backgroundJob.updatedAt,
        })
        .from(backgroundJob)
        .where(where)
        .orderBy(desc(backgroundJob.createdAt))
        .limit(data.limit)
        .offset(data.offset);

      return {
        items: rows,
        limit: data.limit,
        offset: data.offset,
      };
    } catch (error) {
      return toAppServerError(error, 'Failed to list jobs');
    }
  });

export const getJobFn = createServerFn({ method: 'GET' })
  .middleware([clinicalStaffMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context }) => {
    try {
      const rows = await db
        .select({
          id: backgroundJob.id,
          kind: backgroundJob.kind,
          status: backgroundJob.status,
          progress: backgroundJob.progress,
          progressMessage: backgroundJob.progressMessage,
          errorMessage: backgroundJob.errorMessage,
          resultJson: backgroundJob.resultJson,
          logs: backgroundJob.logs,
          tokensUsed: backgroundJob.tokensUsed,
          durationMs: backgroundJob.durationMs,
          createdAt: backgroundJob.createdAt,
          updatedAt: backgroundJob.updatedAt,
          completedAt: backgroundJob.completedAt,
        })
        .from(backgroundJob)
        .where(
          and(
            eq(backgroundJob.id, data.id),
            eq(backgroundJob.userId, context.user.id),
          ),
        )
        .limit(1);

      const row = rows.at(0);

      if (row === undefined) {
        throw new AppServerError('NOT_FOUND', 'Job not found', 404);
      }

      const resultJson =
        row.resultJson === null ? null : toJsonValue(row.resultJson);

      const logs = toJsonValue(row.logs);

      if (!Array.isArray(logs)) {
        throw new AppServerError(
          'INTERNAL_SERVER_ERROR',
          'Job logs have an invalid format',
          500,
        );
      }

      return { ...row, resultJson, logs };
    } catch (error) {
      return toAppServerError(error, 'Failed to load job status');
    }
  });

// ---------------------------------------------------------------------------
// cancelJobFn — the missing alias used by use-jobs.ts
// ---------------------------------------------------------------------------

export const cancelJobFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context }) => {
    try {
      const result = await cancelClinicJob(context.user.id, data.id);

      if (!result.ok) {
        throw new AppServerError(
          result.reason === 'forbidden' ? 'FORBIDDEN' : 'CONFLICT',
          getCancelFailureMessage(result.reason),
          result.reason === 'forbidden' ? 403 : 409,
        );
      }

      return result;
    } catch (error) {
      return toAppServerError(error, 'Failed to cancel job');
    }
  });

export const cancelClinicJobFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context }) => {
    try {
      const result = await cancelClinicJob(context.user.id, data.id);

      if (!result.ok) {
        throw new AppServerError(
          result.reason === 'forbidden' ? 'FORBIDDEN' : 'CONFLICT',
          getCancelFailureMessage(result.reason),
          result.reason === 'forbidden' ? 403 : 409,
        );
      }

      return result;
    } catch (error) {
      return toAppServerError(error, 'Failed to cancel job');
    }
  });
