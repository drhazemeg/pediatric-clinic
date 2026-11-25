import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, db, desc, eq } from "@/db";
import { backgroundJob } from "@/db/schema";
import { cancelClinicJob } from "@/server/queue";
import { AppServerError, toAppServerError } from "../fn-errors";
import { clinicalStaffMiddleware } from "../fn-middleware";

export const getClinicJobFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data, context }) => {
		try {
			const [row] = await db
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
					completedAt: backgroundJob.completedAt
				})
				.from(backgroundJob)
				.where(
					and(
						eq(backgroundJob.id, data.id),
						eq(backgroundJob.userId, context.user.id)
					)
				)
				.limit(1);
			if (!row) {
				throw new AppServerError("NOT_FOUND", "Job not found", 404);
			}
			const resultJson =
				row.resultJson === null ? null : toJsonValue(row.resultJson);
			const logs = toJsonValue(row.logs);
			if (!Array.isArray(logs)) {
				throw new AppServerError(
					"INTERNAL_SERVER_ERROR",
					"Job logs have an invalid format",
					500
				);
			}
			return {
				...row,
				resultJson,
				logs
			};
		} catch (err) {
			toAppServerError(err, "Failed to load job status");
		}
	});

type JsonValue =
	| null
	| boolean
	| number
	| string
	| JsonValue[]
	| { [key: string]: JsonValue };

function toJsonValue(value: unknown): JsonValue {
	const serialized = JSON.stringify(value);
	if (serialized === undefined) {
		throw new AppServerError(
			"INTERNAL_SERVER_ERROR",
			"Job data cannot be serialized",
			500
		);
	}
	return JSON.parse(serialized) as JsonValue;
}
export const listJobsFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			limit: z.number().int().min(1).max(100).default(20),
			offset: z.number().int().min(0).default(0),
			status: z
				.enum([
					"queued",
					"running",
					"completed",
					"completed_partial",
					"failed",
					"cancelled"
				])
				.optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			const where = data.status
				? and(
						eq(backgroundJob.userId, context.user.id),
						eq(backgroundJob.status, data.status)
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
					updatedAt: backgroundJob.updatedAt
				})
				.from(backgroundJob)
				.where(where)
				.orderBy(desc(backgroundJob.createdAt))
				.limit(data.limit)
				.offset(data.offset);

			return {
				items: rows,
				limit: data.limit,
				offset: data.offset
			};
		} catch (err) {
			toAppServerError(err, "Failed to list jobs");
		}
	});

export const getJobFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data, context }) => {
		try {
			const [row] = await db
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
					completedAt: backgroundJob.completedAt
				})
				.from(backgroundJob)
				.where(
					and(
						eq(backgroundJob.id, data.id),
						eq(backgroundJob.userId, context.user.id)
					)
				)
				.limit(1);
			if (!row) {
				throw new AppServerError("NOT_FOUND", "Job not found", 404);
			}
			const resultJson =
				row.resultJson === null ? null : toJsonValue(row.resultJson);
			const logs = toJsonValue(row.logs);
			if (!Array.isArray(logs)) {
				throw new AppServerError(
					"INTERNAL_SERVER_ERROR",
					"Job logs have an invalid format",
					500
				);
			}
			return { ...row, resultJson, logs };
		} catch (err) {
			toAppServerError(err, "Failed to load job status");
		}
	});

// ---------------------------------------------------------------------------
// cancelJobFn — the missing alias used by use-jobs.ts
// ---------------------------------------------------------------------------

export const cancelJobFn = createServerFn({ method: "POST" })
	.middleware([clinicalStaffMiddleware])
	.validator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data, context }) => {
		try {
			const result = await cancelClinicJob(context.user.id, data.id);
			if (!result.ok) {
				const message =
					result.reason === "not_found"
						? "Job not found"
						: result.reason === "forbidden"
							? "You cannot cancel this job"
							: "This job can no longer be cancelled";
				throw new AppServerError(
					result.reason === "forbidden" ? "FORBIDDEN" : "CONFLICT",
					message,
					result.reason === "forbidden" ? 403 : 409
				);
			}
			return result;
		} catch (err) {
			toAppServerError(err, "Failed to cancel job");
		}
	});

export const cancelClinicJobFn = createServerFn({ method: "POST" })
	.middleware([clinicalStaffMiddleware])
	.validator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data, context }) => {
		try {
			const result = await cancelClinicJob(context.user.id, data.id);
			if (!result.ok) {
				const message =
					result.reason === "not_found"
						? "Job not found"
						: result.reason === "forbidden"
							? "You cannot cancel this job"
							: "This job can no longer be cancelled";
				throw new AppServerError(
					result.reason === "forbidden" ? "FORBIDDEN" : "CONFLICT",
					message,
					result.reason === "forbidden" ? 403 : 409
				);
			}
			return result;
		} catch (err) {
			toAppServerError(err, "Failed to cancel job");
		}
	});
