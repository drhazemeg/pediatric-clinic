// src/server/functions/patients.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Indicator } from "#/db/validations.ts";
import type { Sex } from "#/lib/features/development/index.ts";
import {
	createPatientSchema,
	growthCurvesInputSchema,
	growthSeriesInputSchema,
	listPatientsInputSchema,
	patientIdInputSchema,
	updatePatientSchema
} from "#/lib/features/patients/schemas.ts";
import { createId } from "#/lib/id.ts";
import { and, db, eq, isNull, withTransaction } from "@/db";
import { queryCache } from "@/db/cache";
import {
	getPatientById,
	getPatientByMrn,
	listPatientsByClinic,
	searchPatients
} from "@/db/queries/patients.queries";
import { guardianLinks, patients } from "@/db/schema";
import { AppServerError, toAppServerError } from "../fn-errors";
import {
	clinicalStaffMiddleware,
	patientAccessMiddleware,
	providerOrAdminMiddleware
} from "../fn-middleware";

export const getPatientFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.id);
			const patient = await getPatientById(data.id);
			if (!patient) {
				throw new AppServerError("NOT_FOUND", "Patient not found", 404);
			}
			return patient;
		} catch (err) {
			toAppServerError(err, "Failed to load patient");
		}
	});

export const getPatientByMrnFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			clinicId: z.string().min(1),
			mrn: z.string().min(1)
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			const patient = await getPatientByMrn(data.clinicId, data.mrn);
			if (!patient) {
				throw new AppServerError("NOT_FOUND", "Patient not found", 404);
			}
			return patient;
		} catch (err) {
			toAppServerError(err, "Failed to look up patient by MRN");
		}
	});

export const listClinicPatientsFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(z.object({ clinicId: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await listPatientsByClinic(data.clinicId);
		} catch (err) {
			toAppServerError(err, "Failed to list clinic patients");
		}
	});

export const searchClinicPatientsFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			clinicId: z.string().min(1),
			q: z.string().trim().min(1).max(120)
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await searchPatients(data.clinicId, data.q);
		} catch (err) {
			toAppServerError(err, "Failed to search patients");
		}
	});

export const createPatientFn = createServerFn({ method: "POST" })
	.middleware([clinicalStaffMiddleware])
	.validator(createPatientSchema)
	.handler(async ({ data, context }) => {
		try {
			const clinicId = context.guard.resolveClinicId(data.clinicId);
			const [created] = await db
				.insert(patients)
				.values({
					...data,
					clinicId,
					id: createId("patient"),
					createdBy: context.user.id,
					updatedBy: context.user.id
				})
				.returning();

			if (clinicId) {
				queryCache.invalidateTag(`patients:clinic:${clinicId}`);
			}
			return created;
		} catch (err) {
			toAppServerError(err, "Failed to create patient");
		}
	});

export const updatePatientFn = createServerFn({ method: "POST" })
	.middleware([clinicalStaffMiddleware])
	.validator(updatePatientSchema)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.id);
			const { id, expectedVersion, ...patch } = data;
			if (
				context.user.role !== "admin" &&
				patch.clinicId !== undefined &&
				patch.clinicId !== context.user.clinicId
			) {
				throw new AppServerError(
					"FORBIDDEN",
					"Cannot reassign patient to another clinic",
					403
				);
			}

			const updated = await withTransaction(async tx => {
				const [current] = await tx
					.select()
					.from(patients)
					.where(and(eq(patients.id, id), isNull(patients.deletedAt)))
					.limit(1);

				if (!current) {
					throw new AppServerError("NOT_FOUND", "Patient not found", 404);
				}
				if (
					expectedVersion !== undefined &&
					current.version !== expectedVersion
				) {
					throw new AppServerError(
						"CONFLICT",
						"Patient record was modified by another user; please reload",
						409
					);
				}

				const [row] = await tx
					.update(patients)
					.set({
						...patch,
						version: current.version + 1,
						updatedBy: context.user.id,
						updatedAt: new Date()
					})
					.where(eq(patients.id, id))
					.returning();

				return row;
			});

			queryCache.invalidateTag(`patient:${id}`);
			if (updated?.clinicId) {
				queryCache.invalidateTag(`patients:clinic:${updated.clinicId}`);
			}
			return updated;
		} catch (err) {
			toAppServerError(err, "Failed to update patient");
		}
	});

export const softDeletePatientFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.id);
			const [row] = await db
				.update(patients)
				.set({
					deletedAt: new Date(),
					isActive: false,
					updatedBy: context.user.id,
					updatedAt: new Date()
				})
				.where(and(eq(patients.id, data.id), isNull(patients.deletedAt)))
				.returning();

			if (!row) {
				throw new AppServerError("NOT_FOUND", "Patient not found", 404);
			}
			queryCache.invalidateTag(`patient:${data.id}`);
			if (row.clinicId) {
				queryCache.invalidateTag(`patients:clinic:${row.clinicId}`);
			}
			return { deleted: true as const, id: row.id };
		} catch (err) {
			toAppServerError(err, "Failed to archive patient");
		}
	});

export const linkGuardianFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(
		z.object({
			userId: z.string().min(1),
			patientId: z.string().min(1),
			relation: z.string().trim().min(1).max(80),
			guardianName: z.string().trim().min(1).max(200),
			phone: z.string().trim().min(1).max(40),
			isPrimary: z.boolean().optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.patientId);
			const [linked] = await db
				.insert(guardianLinks)
				.values(data)
				.onConflictDoUpdate({
					target: [guardianLinks.userId, guardianLinks.patientId],
					set: {
						relation: data.relation,
						isPrimary: data.isPrimary ?? false
					}
				})
				.returning();
			queryCache.invalidateTag(`patient:${data.patientId}`);
			return linked;
		} catch (err) {
			toAppServerError(err, "Failed to link guardian");
		}
	});

export const unlinkGuardianFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(
		z.object({
			userId: z.string().min(1),
			patientId: z.string().min(1)
		})
	)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.patientId);
			await db
				.delete(guardianLinks)
				.where(
					and(
						eq(guardianLinks.userId, data.userId),
						eq(guardianLinks.patientId, data.patientId)
					)
				);
			queryCache.invalidateTag(`patient:${data.patientId}`);
			return { unlinked: true as const };
		} catch (err) {
			toAppServerError(err, "Failed to unlink guardian");
		}
	});
export const fetchPatientsListFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(listPatientsInputSchema)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			const { listPatientsByClinic, searchPatients } = await import(
				"@/db/queries/patients.queries"
			);
			if (data.q && data.q.length > 0) {
				return await searchPatients(data.clinicId, data.q);
			}
			return await listPatientsByClinic(data.clinicId);
		} catch (err) {
			toAppServerError(err, "Failed to fetch patients list");
		}
	});

export const fetchPatientDetailFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(patientIdInputSchema)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.patientId);
			const { getFullPatientChart } = await import(
				"@/db/queries/patients.queries"
			);
			const patient = await getFullPatientChart(data.patientId);
			if (!patient) {
				throw new AppServerError("NOT_FOUND", "Patient not found", 404);
			}
			return patient;
		} catch (err) {
			toAppServerError(err, "Failed to load patient details");
		}
	});

export const fetchGrowthSeriesFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(growthSeriesInputSchema)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.patientId);
			const { indicatorTrend, listIndicatorSeries } = await import(
				"@/db/queries/growth.queries"
			);
			const [series, trend] = await Promise.all([
				listIndicatorSeries(data.patientId, data.indicator as Indicator),
				indicatorTrend(data.patientId, data.indicator as Indicator)
			]);
			return { series, trend };
		} catch (err) {
			toAppServerError(err, "Failed to load growth series");
		}
	});

export const fetchGrowthCurvesFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(growthCurvesInputSchema)
	.handler(async ({ data }) => {
		try {
			const { getGrowthChartCurves } = await import(
				"@/db/queries/growth.queries"
			);
			const { indicator, sex, ...range } = data;
			return await getGrowthChartCurves(
				indicator as Indicator,
				sex as Sex,
				range as never
			);
		} catch (err) {
			toAppServerError(err, "Failed to load growth curves");
		}
	});
