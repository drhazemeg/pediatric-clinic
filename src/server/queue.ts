import type { ClinicGenerationInput } from '@/lib/ai/schemas';
import type { Job } from 'bullmq';

import { Queue, Worker } from 'bullmq';
import { and, eq, notInArray } from 'drizzle-orm';
import IORedis from 'ioredis';
import { z } from 'zod';

import { backgroundJob, db } from '@/db';
import { env } from '@/env/server';
import { executeClinicAi } from '@/lib/ai';

import { resolveUserAiConfig } from './functions/settings.functions';
import { logger } from './logger';
// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type JobKind =
  | 'growth_recalc'
  | 'immunization_sweep'
  | 'ledger_report'
  | 'certificate_pdf'
  | 'ai_soap_draft'
  | 'ai_patient_education'
  | 'ai_differential_dx'
  | 'ai_dosing_safety'
  | 'ai_growth_interpretation'
  | 'ai_immunization_advice'
  | 'ai_follow_up_questions';

export interface JobData {
  kind: JobKind;
  jobId: string;
  userId: string;
  payload: JobPayload;
}

export interface JobPayload {
  aiInput?: Omit<ClinicGenerationInput, 'apiKeyConfig'>;
  patientId?: string;
  clinicId?: string;
  certificateId?: string;
}

export type CancelJobResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'forbidden' | 'not_cancellable' };

const QUEUE_NAME = 'clinic-jobs';
const CANCEL_POLL_MS = 500;
const HEARTBEAT_MS = 10_000;
const connectionOptions = { maxRetriesPerRequest: null };

const aiTokenResultSchema = z.object({
  meta: z
    .object({
      tokensUsed: z.number().optional(),
    })
    .optional(),
});

const errorWithNameSchema = z.object({
  name: z.string().optional(),
  tokensUsed: z.number().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Redis / Queue / Worker singletons
// ─────────────────────────────────────────────────────────────────────────────

let redisConnection: IORedis | null = null;
let clinicQueue: Queue<JobData> | null = null;
let clinicWorker: Worker<JobData> | null = null;
let workerInitialized = false;

const getRedisConnection = (): IORedis | null => {
  if (env.REDIS_URL === '') {
    return null;
  }

  if (redisConnection !== null) {
    return redisConnection;
  }

  try {
    redisConnection = new IORedis(env.REDIS_URL, connectionOptions);
    redisConnection.on('error', (err) =>
      logger.warn('Redis connection error in clinic job queue', {
        error: String(err),
      }),
    );
  } catch (error) {
    logger.warn('Failed to initialize Redis client', { error: String(error) });

    return null;
  }

  return redisConnection;
};

export function getClinicQueue(): Queue<JobData> | null {
  if (clinicQueue !== null) {
    return clinicQueue;
  }

  const conn = getRedisConnection();

  if (conn === null) {
    return null;
  }

  try {
    clinicQueue = new Queue<JobData>(QUEUE_NAME, {
      connection: conn,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  } catch (error) {
    logger.warn('Failed to initialize BullMQ queue', { error: String(error) });

    return null;
  }

  return clinicQueue;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancellation / heartbeat helpers
// ─────────────────────────────────────────────────────────────────────────────

class JobCancelledError extends Error {
  constructor() {
    super('JOB_CANCELLED');
    this.name = 'JobCancelledError';
  }
}

const createCancellationPoller = (jobId: string) => {
  let cancelled = false;

  const pollCancellation = async () => {
    try {
      const rows = await db
        .select({ status: backgroundJob.status })
        .from(backgroundJob)
        .where(eq(backgroundJob.id, jobId))
        .limit(1);

      if (rows.at(0)?.status === 'cancelled') {
        cancelled = true;
      }
    } catch {
      // Ignore transient polling failures
    }
  };

  const interval = setInterval(() => {
    void pollCancellation();
  }, CANCEL_POLL_MS);

  return {
    stop: () => clearInterval(interval),
    check: () => {
      if (cancelled) {
        throw new JobCancelledError();
      }
    },
  };
};

const startHeartbeat = (jobId: string) => {
  const sendHeartbeat = async () => {
    try {
      await db
        .update(backgroundJob)
        .set({ updatedAt: new Date() })
        .where(eq(backgroundJob.id, jobId));
    } catch {
      // Ignore transient heartbeat failures
    }
  };

  const interval = setInterval(() => {
    void sendHeartbeat();
  }, HEARTBEAT_MS);

  return () => clearInterval(interval);
};

// ─────────────────────────────────────────────────────────────────────────────
// Job execution core
// ─────────────────────────────────────────────────────────────────────────────

const runJob = async (
  data: JobData,
  updateProgress?: (progress: number, message: string) => Promise<void>,
): Promise<object> => {
  const { kind, payload } = data;

  switch (kind) {
    case 'ai_soap_draft':
    case 'ai_patient_education':
    case 'ai_differential_dx':
    case 'ai_dosing_safety':
    case 'ai_growth_interpretation':
    case 'ai_immunization_advice':
    case 'ai_follow_up_questions': {
      if (payload.aiInput === undefined) {
        throw new Error(`Job ${kind} requires payload.aiInput`);
      }

      await updateProgress?.(10, 'Memanggil AI...');

      const aiRes = await executeClinicAi({
        ...payload.aiInput,
        apiKeyConfig: await resolveUserAiConfig(data.userId),
      });

      await updateProgress?.(90, 'AI selesai, menyimpan hasil...');

      return {
        taskKind: aiRes.taskKind,
        data: aiRes.data,
        meta: aiRes.meta,
        requiresPhysicianVerification: true,
      };
    }

    case 'growth_recalc': {
      return { status: 'completed', patientId: payload.patientId };
    }

    case 'immunization_sweep': {
      return { status: 'completed', clinicId: payload.clinicId };
    }

    case 'ledger_report': {
      return { status: 'completed', clinicId: payload.clinicId };
    }

    case 'certificate_pdf': {
      return { status: 'completed', certificateId: payload.certificateId };
    }

    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown job kind: ${String(_exhaustive)}`);
    }
  }
};

const processClinicJob = async (
  data: JobData,
  bullJob?: Job<JobData>,
): Promise<void> => {
  const { jobId, kind } = data;
  const startTime = Date.now();

  // Claim (idempotent, skips cancelled/completed)
  const claimedRows = await db
    .update(backgroundJob)
    .set({ status: 'running', updatedAt: new Date() })
    .where(
      and(
        eq(backgroundJob.id, jobId),
        notInArray(backgroundJob.status, [
          'cancelled',
          'completed',
          'completed_partial',
        ]),
      ),
    )
    .returning({ id: backgroundJob.id });

  if (claimedRows.at(0) === undefined) {
    return;
  }

  const cancelPoll = createCancellationPoller(jobId);
  const stopHeartbeat = startHeartbeat(jobId);

  let maxProgress = 0;

  const updateProgress = async (progress: number, message: string) => {
    cancelPoll.check();
    const next = Math.max(maxProgress, progress);
    maxProgress = next;

    if (bullJob !== undefined) {
      await bullJob.updateProgress(next).catch(() => null);
    }

    const updatedRows = await db
      .update(backgroundJob)
      .set({ progress: next, progressMessage: message, updatedAt: new Date() })
      .where(
        and(
          eq(backgroundJob.id, jobId),
          notInArray(backgroundJob.status, ['cancelled']),
        ),
      )
      .returning({ id: backgroundJob.id });

    if (updatedRows.at(0) === undefined) {
      throw new JobCancelledError();
    }
  };

  try {
    await updateProgress(5, 'Memulai proses...');
    cancelPoll.check();
    const result = await runJob(data, updateProgress);
    cancelPoll.check();

    await db
      .update(backgroundJob)
      .set({
        status: 'completed',
        progress: 100,
        progressMessage: 'Completed successfully',
        resultJson: result,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(backgroundJob.id, jobId),
          notInArray(backgroundJob.status, ['cancelled']),
        ),
      );

    // Deduct credit if AI was used and tokens were consumed
    const parsedMeta = aiTokenResultSchema.safeParse(result);

    const tokensUsed = parsedMeta.success
      ? parsedMeta.data.meta?.tokensUsed
      : undefined;

    if (tokensUsed !== undefined && tokensUsed > 0) {
      const jobRows = await db
        .select({ userId: backgroundJob.userId })
        .from(backgroundJob)
        .where(eq(backgroundJob.id, jobId))
        .limit(1);

      const jobRow = jobRows.at(0);

      if (jobRow !== undefined) {
        const { deductCredit } = await import('@/lib/utils/credit');
        await deductCredit(jobRow.userId, tokensUsed).catch(() => null);
      }
    }
  } catch (error: unknown) {
    const parsedError = errorWithNameSchema.safeParse(error);

    const isCancelled =
      error instanceof JobCancelledError ||
      (parsedError.success && parsedError.data.name === 'JobCancelledError');

    if (isCancelled) {
      await db
        .update(backgroundJob)
        .set({
          status: 'cancelled',
          errorMessage: 'Dibatalkan pengguna',
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(backgroundJob.id, jobId));

      return;
    }

    const errorObj = error instanceof Error ? error : null;
    const message = errorObj?.message ?? String(error);

    const errorTokens = parsedError.success
      ? parsedError.data.tokensUsed
      : undefined;

    logger.error('Clinic background job failed', {
      jobId,
      kind,
      error: message,
    });

    await db
      .update(backgroundJob)
      .set({
        status: 'failed',
        errorMessage: message,
        tokensUsed: errorTokens,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(backgroundJob.id, jobId));

    // Rethrow so BullMQ retries
    throw error;
  } finally {
    stopHeartbeat();
    cancelPoll.stop();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Public: enqueue
// ─────────────────────────────────────────────────────────────────────────────

export async function enqueueClinicJob(
  kind: JobKind,
  userId: string,
  payload: JobPayload,
): Promise<string> {
  const jobId = crypto.randomUUID();

  await db.insert(backgroundJob).values({
    id: jobId,
    userId,
    kind,
    status: 'pending',
    progress: 0,
    progressMessage: 'Queued for processing',
    inputJson: payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const data: JobData = { kind, jobId, userId, payload };

  const q = getClinicQueue();

  if (q !== null) {
    try {
      await q.add(kind, data, { jobId });

      return jobId;
    } catch (error) {
      logger.warn('Failed to enqueue job in Redis, falling back to inline', {
        jobId,
        error: String(error),
      });
    }
  }

  // Fallback: run inline (dev / Redis offline)
  void processClinicJob(data).catch(() => null);

  return jobId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: cancel
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelClinicJob(
  userId: string,
  jobId: string,
): Promise<CancelJobResult> {
  const rows = await db
    .select({
      id: backgroundJob.id,
      userId: backgroundJob.userId,
      status: backgroundJob.status,
    })
    .from(backgroundJob)
    .where(eq(backgroundJob.id, jobId))
    .limit(1);

  const row = rows.at(0);

  if (row === undefined) {
    return { ok: false, reason: 'not_found' };
  }

  if (row.userId !== userId) {
    return { ok: false, reason: 'forbidden' };
  }

  if (
    ['completed', 'completed_partial', 'failed', 'cancelled'].includes(
      row.status,
    )
  ) {
    return { ok: false, reason: 'not_cancellable' };
  }

  await db
    .update(backgroundJob)
    .set({
      status: 'cancelled',
      errorMessage: 'Dibatalkan pengguna',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(backgroundJob.id, jobId));

  const q = getClinicQueue();

  if (q !== null) {
    const bullJob = await q.getJob(jobId).catch(() => null);

    if (bullJob !== null && bullJob !== undefined) {
      await bullJob.remove().catch(() => null);
    }
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: status
// ─────────────────────────────────────────────────────────────────────────────

export async function getClinicJob(jobId: string, userId: string) {
  const rows = await db
    .select()
    .from(backgroundJob)
    .where(eq(backgroundJob.id, jobId))
    .limit(1);

  const row = rows.at(0);

  if (row === undefined || row.userId !== userId) {
    return null;
  }

  return row;
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker bootstrap
// ─────────────────────────────────────────────────────────────────────────────

const ensureWorkerStarted = (): void => {
  if (workerInitialized) {
    return;
  }

  workerInitialized = true;

  const conn = getRedisConnection();

  if (conn === null) {
    logger.warn('BullMQ worker not started (Redis unavailable)', {});

    return;
  }

  try {
    clinicWorker = new Worker<JobData>(
      QUEUE_NAME,
      async (job: Job<JobData>) => await processClinicJob(job.data, job),
      { connection: conn, concurrency: 3 },
    );
    clinicWorker.on('failed', (job, err) =>
      logger.warn(`Job ${job?.id} failed: ${err.message}`),
    );
    clinicWorker.on('error', (err) =>
      logger.warn('Clinic worker error', { error: String(err) }),
    );
  } catch (error) {
    logger.warn('BullMQ worker could not be started', { error: String(error) });
  }
};

ensureWorkerStarted();
