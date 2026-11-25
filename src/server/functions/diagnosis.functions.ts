// src/server/functions/diagnosis.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { queryCache } from "@/db/cache";
import {
	createDiagnoses,
	createDiagnosis,
	deleteDiagnosis,
	getDiagnosisById,
	listDiagnosesForPatient,
	listDiagnosesForVisit,
	searchDiagnosesByClinic,
	topDiagnosesForClinic,
	updateDiagnosis
} from "@/db/queries/diagnosis.queries";
import { toAppServerError } from "../fn-errors";
import {
	diagnosisReadMiddleware,
	providerOrAdminMiddleware
} from "../fn-middleware";

const diagnosisTypeSchema = z.enum(["primary", "secondary"]);

const createDiagnosisItemSchema = z.object({
	visitId: z.string().min(1),
	icdCode: z.string().trim().min(1).max(32),
	description: z.string().trim().min(1).max(500),
	type: diagnosisTypeSchema.default("primary")
});

export const getDiagnosisFn = createServerFn({ method: "GET" })
	.middleware([diagnosisReadMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertDiagnosisAccess(data.id);
			const row = await getDiagnosisById(data.id);
			if (!row) throw new Error("Diagnosis not found");
			return row;
		} catch (err) {
			toAppServerError(err, "Failed to load diagnosis");
		}
	});

export const listVisitDiagnosesFn = createServerFn({ method: "GET" })
	.middleware([diagnosisReadMiddleware])
	.validator(z.object({ visitId: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertVisitAccess(data.visitId);
			return await listDiagnosesForVisit(data.visitId);
		} catch (err) {
			toAppServerError(err, "Failed to load visit diagnoses");
		}
	});

export const listPatientDiagnosesFn = createServerFn({ method: "GET" })
	.middleware([diagnosisReadMiddleware])
	.validator(z.object({ patientId: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.patientId);
			return await listDiagnosesForPatient(data.patientId);
		} catch (err) {
			toAppServerError(err, "Failed to load patient diagnoses");
		}
	});

export const searchClinicDiagnosesFn = createServerFn({ method: "GET" })
	.middleware([providerOrAdminMiddleware])
	.validator(
		z.object({
			clinicId: z.string().min(1),
			query: z.string().trim().min(1).max(120)
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await searchDiagnosesByClinic(data.clinicId, data.query);
		} catch (err) {
			toAppServerError(err, "Failed to search clinic diagnoses");
		}
	});

export const topClinicDiagnosesFn = createServerFn({ method: "GET" })
	.middleware([providerOrAdminMiddleware])
	.validator(
		z.object({
			clinicId: z.string().min(1),
			limit: z.number().int().min(1).max(100).default(20)
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await topDiagnosesForClinic(data.clinicId, data.limit);
		} catch (err) {
			toAppServerError(err, "Failed to load top clinic diagnoses");
		}
	});

export const createDiagnosisFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(createDiagnosisItemSchema)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertVisitAccess(data.visitId);
			const row = await createDiagnosis(data);
			queryCache.invalidateTag(`diagnoses:visit:${data.visitId}`);
			return row;
		} catch (err) {
			toAppServerError(err, "Failed to create diagnosis");
		}
	});

export const createDiagnosesBulkFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(
		z.object({
			rows: z.array(createDiagnosisItemSchema).min(1)
		})
	)
	.handler(async ({ data, context }) => {
		try {
			const visitIds = new Set(data.rows.map(r => r.visitId));
			await Promise.all(
				Array.from(visitIds, visitId =>
					context.guard.assertVisitAccess(visitId)
				)
			);
			const rows = await createDiagnoses(data.rows);
			for (const r of data.rows) {
				queryCache.invalidateTag(`diagnoses:visit:${r.visitId}`);
			}
			return rows;
		} catch (err) {
			toAppServerError(err, "Failed to save diagnoses");
		}
	});

export const updateDiagnosisFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(
		z.object({
			id: z.string().min(1),
			patch: z.object({
				icdCode: z.string().trim().min(1).max(32).optional(),
				description: z.string().trim().min(1).max(500).optional(),
				type: diagnosisTypeSchema.optional()
			})
		})
	)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertDiagnosisAccess(data.id);
			const row = await updateDiagnosis(data.id, data.patch);
			if (!row) throw new Error("Diagnosis not found");
			queryCache.invalidateTag(`diagnoses:visit:${row.visitId}`);
			return row;
		} catch (err) {
			toAppServerError(err, "Failed to update diagnosis");
		}
	});

export const deleteDiagnosisFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(
		z.object({
			id: z.string().min(1),
			visitId: z.string().min(1).optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			const existing = await context.guard.assertDiagnosisAccess(data.id, {
				expectedVisitId: data.visitId
			});
			await deleteDiagnosis(data.id);
			queryCache.invalidateTag(`diagnoses:visit:${existing.visitId}`);
			return { deleted: true as const, id: data.id };
		} catch (err) {
			toAppServerError(err, "Failed to delete diagnosis");
		}
	});
