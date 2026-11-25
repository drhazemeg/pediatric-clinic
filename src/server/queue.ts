import { type Job, Queue, Worker } from "bullmq";
import { and, eq, notInArray } from "drizzle-orm";
import IORedis from "ioredis";
import { backgroundJob, db } from "@/db";
import { env } from "@/env/server";
import { executeClinicAi } from "@/lib/ai";
import type { ClinicGenerationInput } from "@/lib/ai/schemas";
import { resolveUserAiConfig } from "./functions/settings.functions";
import { logger } from "./logger";
// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type JobKind =
	| "growth_recalc"
	| "immunization_sweep"
	| "ledger_report"
	| "certificate_pdf"
	| "ai_soap_draft"
	| "ai_patient_education"
	| "ai_differential_dx"
	| "ai_dosing_safety"
	| "ai_growth_interpretation"
	| "ai_immunization_advice"
	| "ai_follow_up_questions";

export interface JobData {
	kind: JobKind;
	jobId: string;
	userId: string;
	payload: Record<string, unknown>;
}

export type CancelJobResult =
	| { ok: true }
	| { ok: false; reason: "not_found" | "forbidden" | "not_cancellable" };

const QUEUE_NAME = "clinic-jobs";
const CANCEL_POLL_MS = 500;
const HEARTBEAT_MS = 10_000;
const connectionOptions = { maxRetriesPerRequest: null };

// ─────────────────────────────────────────────────────────────────────────────
// Redis / Queue / Worker singletons
// ─────────────────────────────────────────────────────────────────────────────

let redisConnection: IORedis | null = null;
let clinicQueue: Queue<JobData> | null = null;
let clinicWorker: Worker<JobData> | null = null;
let workerInitialized = false;

function getRedisConnection(): IORedis | null {
	if (!env.REDIS_URL) return null;
	if (redisConnection) return redisConnection;
	try {
		redisConnection = new IORedis(env.REDIS_URL, connectionOptions);
		redisConnection.on("error", err =>
			logger.warn("Redis connection error in clinic job queue", {
				error: String(err)
			})
		);
	} catch (e) {
		logger.warn("Failed to initialize Redis client", { error: String(e) });
		return null;
	}
	return redisConnection;
}

export function getClinicQueue(): Queue<JobData> | null {
	if (clinicQueue) return clinicQueue;
	const conn = getRedisConnection();
	if (!conn) return null;
	try {
		clinicQueue = new Queue<JobData>(QUEUE_NAME, {
			connection: conn,
			defaultJobOptions: {
				attempts: 2,
				backoff: { type: "exponential", delay: 2000 },
				removeOnComplete: 100,
				removeOnFail: 500
			}
		});
	} catch (e) {
		logger.warn("Failed to initialize BullMQ queue", { error: String(e) });
		return null;
	}
	return clinicQueue;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancellation / heartbeat helpers
// ─────────────────────────────────────────────────────────────────────────────

class JobCancelledError extends Error {
	constructor() {
		super("JOB_CANCELLED");
		this.name = "JobCancelledError";
	}
}

function createCancellationPoller(jobId: string) {
	let cancelled = false;
	const interval = setInterval(() => {
		db.select({ status: backgroundJob.status })
			.from(backgroundJob)
			.where(eq(backgroundJob.id, jobId))
			.limit(1)
			.then(([row]) => {
				if (row?.status === "cancelled") cancelled = true;
			})
			.catch(() => {});
	}, CANCEL_POLL_MS);
	return {
		stop: () => clearInterval(interval),
		check: () => {
			if (cancelled) throw new JobCancelledError();
		}
	};
}

function startHeartbeat(jobId: string) {
	const interval = setInterval(() => {
		db.update(backgroundJob)
			.set({ updatedAt: new Date() })
			.where(eq(backgroundJob.id, jobId))
			.catch(() => {});
	}, HEARTBEAT_MS);
	return () => clearInterval(interval);
}

// ─────────────────────────────────────────────────────────────────────────────
// Job execution core
// ─────────────────────────────────────────────────────────────────────────────

async function runJob(
	data: JobData,
	updateProgress?: (progress: number, message: string) => Promise<void>
): Promise<Record<string, unknown>> {
	const { kind, payload } = data;

	switch (kind) {
		case "ai_soap_draft":
		case "ai_patient_education":
		case "ai_differential_dx":
		case "ai_dosing_safety":
		case "ai_growth_interpretation":
		case "ai_immunization_advice":
		case "ai_follow_up_questions": {
			if (!payload.aiInput) {
				throw new Error(`Job ${kind} requires payload.aiInput`);
			}
			await updateProgress?.(10, "Memanggil AI...");
			const aiInput = payload.aiInput as Omit<
				ClinicGenerationInput,
				"apiKeyConfig"
			>;
			const aiRes = await executeClinicAi({
				...aiInput,
				apiKeyConfig: await resolveUserAiConfig(data.userId)
			});
			await updateProgress?.(90, "AI selesai, menyimpan hasil...");
			return {
				taskKind: aiRes.taskKind,
				data: aiRes.data,
				meta: aiRes.meta,
				requiresPhysicianVerification: true
			};
		}
		case "growth_recalc":
			return { status: "completed", patientId: payload.patientId };
		case "immunization_sweep":
			return { status: "completed", clinicId: payload.clinicId };
		case "ledger_report":
			return { status: "completed", clinicId: payload.clinicId };
		case "certificate_pdf":
			return { status: "completed", certificateId: payload.certificateId };
		default: {
			const _exhaustive: never = kind;
			throw new Error(`Unknown job kind: ${String(_exhaustive)}`);
		}
	}
}

async function processClinicJob(
	data: JobData,
	bullJob?: Job<JobData>
): Promise<void> {
	const { jobId, kind } = data;
	const startTime = Date.now();

	// Claim (idempotent, skips cancelled/completed)
	const [claimed] = await db
		.update(backgroundJob)
		.set({ status: "running", updatedAt: new Date() })
		.where(
			and(
				eq(backgroundJob.id, jobId),
				notInArray(backgroundJob.status, [
					"cancelled",
					"completed",
					"completed_partial"
				])
			)
		)
		.returning({ id: backgroundJob.id });

	if (!claimed) return;

	const cancelPoll = createCancellationPoller(jobId);
	const stopHeartbeat = startHeartbeat(jobId);

	let maxProgress = 0;
	const updateProgress = async (progress: number, message: string) => {
		cancelPoll.check();
		const next = Math.max(maxProgress, progress);
		maxProgress = next;
		if (bullJob) await bullJob.updateProgress(next).catch(() => {});
		const [updated] = await db
			.update(backgroundJob)
			.set({ progress: next, progressMessage: message, updatedAt: new Date() })
			.where(
				and(
					eq(backgroundJob.id, jobId),
					notInArray(backgroundJob.status, ["cancelled"])
				)
			)
			.returning({ id: backgroundJob.id });
		if (!updated) throw new JobCancelledError();
	};

	try {
		await updateProgress(5, "Memulai proses...");
		cancelPoll.check();
		const result = await runJob(data, updateProgress);
		cancelPoll.check();

		await db
			.update(backgroundJob)
			.set({
				status: "completed",
				progress: 100,
				progressMessage: "Completed successfully",
				resultJson: result as Record<string, unknown>,
				durationMs: Date.now() - startTime,
				completedAt: new Date(),
				updatedAt: new Date()
			})
			.where(
				and(
					eq(backgroundJob.id, jobId),
					notInArray(backgroundJob.status, ["cancelled"])
				)
			);

		// Deduct credit if AI was used and tokens were consumed
		const tokensUsed = (result?.meta as Record<string, unknown>)?.tokensUsed;
		if (typeof tokensUsed === "number" && tokensUsed > 0) {
			const [row] = await db
				.select({ userId: backgroundJob.userId })
				.from(backgroundJob)
				.where(eq(backgroundJob.id, jobId))
				.limit(1);
			if (row) {
				const { deductCredit } = await import("@/lib/utils/credit");
				await deductCredit(row.userId, tokensUsed).catch(() => {});
			}
		}
	} catch (err: unknown) {
		const isCancelled =
			err instanceof JobCancelledError ||
			(typeof err === "object" &&
				err !== null &&
				"name" in err &&
				err.name === "JobCancelledError");

		if (isCancelled) {
			await db
				.update(backgroundJob)
				.set({
					status: "cancelled",
					errorMessage: "Dibatalkan pengguna",
					durationMs: Date.now() - startTime,
					completedAt: new Date(),
					updatedAt: new Date()
				})
				.where(eq(backgroundJob.id, jobId));
			return;
		}

		const errorObj = err instanceof Error ? err : null;
		const message = errorObj?.message ?? String(err);
		const errorTokens =
			typeof err === "object" &&
			err !== null &&
			"tokensUsed" in err &&
			typeof err.tokensUsed === "number"
				? err.tokensUsed
				: undefined;

		logger.error("Clinic background job failed", {
			jobId,
			kind,
			error: message
		});

		await db
			.update(backgroundJob)
			.set({
				status: "failed",
				errorMessage: message,
				tokensUsed: errorTokens,
				durationMs: Date.now() - startTime,
				completedAt: new Date(),
				updatedAt: new Date()
			})
			.where(eq(backgroundJob.id, jobId));

		throw err; // rethrow so BullMQ retries
	} finally {
		stopHeartbeat();
		cancelPoll.stop();
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: enqueue
// ─────────────────────────────────────────────────────────────────────────────

export async function enqueueClinicJob(
	kind: JobKind,
	userId: string,
	payload: Record<string, unknown>
): Promise<string> {
	const jobId = crypto.randomUUID();

	await db.insert(backgroundJob).values({
		id: jobId,
		userId,
		kind,
		status: "pending",
		progress: 0,
		progressMessage: "Queued for processing",
		inputJson: payload,
		createdAt: new Date(),
		updatedAt: new Date()
	});

	const data: JobData = { kind, jobId, userId, payload };

	const q = getClinicQueue();
	if (q) {
		try {
			await q.add(kind, data, { jobId });
			return jobId;
		} catch (e) {
			logger.warn("Failed to enqueue job in Redis, falling back to inline", {
				jobId,
				error: String(e)
			});
		}
	}

	// Fallback: run inline (dev / Redis offline)
	void processClinicJob(data).catch(() => {});
	return jobId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: cancel
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelClinicJob(
	userId: string,
	jobId: string
): Promise<CancelJobResult> {
	const [row] = await db
		.select({
			id: backgroundJob.id,
			userId: backgroundJob.userId,
			status: backgroundJob.status
		})
		.from(backgroundJob)
		.where(eq(backgroundJob.id, jobId))
		.limit(1);

	if (!row) return { ok: false, reason: "not_found" };
	if (row.userId !== userId) return { ok: false, reason: "forbidden" };
	if (
		["completed", "completed_partial", "failed", "cancelled"].includes(
			row.status
		)
	) {
		return { ok: false, reason: "not_cancellable" };
	}

	await db
		.update(backgroundJob)
		.set({
			status: "cancelled",
			errorMessage: "Dibatalkan pengguna",
			completedAt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(backgroundJob.id, jobId));

	const q = getClinicQueue();
	if (q) {
		const bullJob = await q.getJob(jobId).catch(() => null);
		if (bullJob) await bullJob.remove().catch(() => {});
	}

	return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: status
// ─────────────────────────────────────────────────────────────────────────────

export async function getClinicJob(jobId: string, userId: string) {
	const [row] = await db
		.select()
		.from(backgroundJob)
		.where(eq(backgroundJob.id, jobId))
		.limit(1);
	if (!row || row.userId !== userId) return null;
	return row;
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker bootstrap
// ─────────────────────────────────────────────────────────────────────────────

function ensureWorkerStarted(): void {
	if (workerInitialized) return;
	workerInitialized = true;

	const conn = getRedisConnection();
	if (!conn) {
		logger.warn("BullMQ worker not started (Redis unavailable)", {});
		return;
	}

	try {
		clinicWorker = new Worker<JobData>(
			QUEUE_NAME,
			async (job: Job<JobData>) => processClinicJob(job.data, job),
			{ connection: conn, concurrency: 3 }
		);
		clinicWorker.on("failed", (job, err) =>
			logger.warn(`Job ${job?.id} failed: ${err.message}`)
		);
		clinicWorker.on("error", err =>
			logger.warn("Clinic worker error", { error: String(err) })
		);
	} catch (e) {
		logger.warn("BullMQ worker could not be started", { error: String(e) });
	}
}

ensureWorkerStarted();
