// src/server/functions/immunizations.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { queryCache } from "@/db/cache";
import {
	getCoverage,
	getImmunizationMatrix,
	getPatientImmunizations,
	recordImmunization,
	updateImmunization
} from "@/db/queries/immunization.queries";
import { AppServerError, toAppServerError } from "../fn-errors";
import {
	clinicalStaffMiddleware,
	patientAccessMiddleware
} from "../fn-middleware";

const immunizationStatusSchema = z.enum([
	"planned",
	"due",
	"administered",
	"deferred",
	"contraindicated",
	"missed",
	"refused"
]);

export const getPatientImmunizationsFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(
		z.object({
			patientId: z.string().min(1),
			patientDob: z.coerce.date().optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.patientId);
			return await getPatientImmunizations(data.patientId, data.patientDob);
		} catch (err) {
			toAppServerError(err, "Failed to load patient immunizations");
		}
	});

export const getImmunizationCoverageFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(z.object({ clinicId: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await getCoverage(data.clinicId);
		} catch (err) {
			toAppServerError(err, "Failed to compute immunization coverage");
		}
	});

export const getImmunizationMatrixFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			clinicId: z.string().min(1),
			ageBracket: z.enum(["0-6", "6-12", "12-24", ">24"]).optional(),
			onlyOverdue: z.boolean().optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await getImmunizationMatrix(data.clinicId, {
				ageBracket: data.ageBracket,
				onlyOverdue: data.onlyOverdue
			});
		} catch (err) {
			toAppServerError(err, "Failed to load immunization matrix");
		}
	});

export const recordImmunizationFn = createServerFn({ method: "POST" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			patientId: z.string().min(1),
			visitId: z.string().min(1).nullable().optional(),
			vaccineId: z.string().min(1).nullable().optional(),
			vaccineKey: z.string().min(1),
			vaccineName: z.string().min(1),
			doseNumber: z.number().int().min(0).nullable().optional(),
			targetAgeMonths: z.number().min(0),
			status: immunizationStatusSchema.default("planned"),
			administeredDate: z.coerce.date().nullable().optional(),
			dueDate: z.string().nullable().optional(),
			nextDueDate: z.string().nullable().optional(),
			manufacturer: z.string().nullable().optional(),
			lotNumber: z.string().nullable().optional(),
			site: z.string().nullable().optional(),
			route: z.string().nullable().optional(),
			administeredById: z.string().nullable().optional(),
			administeredByName: z.string().nullable().optional(),
			facility: z.string().nullable().optional(),
			expiryDate: z.string().nullable().optional(),
			adverseEvents: z.string().nullable().optional(),
			notes: z.string().nullable().optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			const patient = await context.guard.assertPatientAccess(data.patientId);
			if (data.visitId) {
				await context.guard.assertVisitAccess(data.visitId, {
					expectedPatientId: data.patientId,
					expectedClinicId: patient.clinicId ?? undefined
				});
			}
			const row = await recordImmunization({
				...data,
				createdBy: context.user.id,
				updatedBy: context.user.id
			} as never);
			queryCache.invalidateTag(`immunizations:patient:${data.patientId}`);
			return row;
		} catch (err) {
			toAppServerError(err, "Failed to record immunization");
		}
	});

export const updateImmunizationFn = createServerFn({ method: "POST" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			id: z.string().min(1),
			patientId: z.string().min(1),
			expectedVersion: z.number().int().min(1),
			patch: z.object({
				status: immunizationStatusSchema.optional(),
				administeredDate: z.coerce.date().nullable().optional(),
				dueDate: z.string().nullable().optional(),
				nextDueDate: z.string().nullable().optional(),
				manufacturer: z.string().nullable().optional(),
				lotNumber: z.string().nullable().optional(),
				site: z.string().nullable().optional(),
				route: z.string().nullable().optional(),
				administeredById: z.string().nullable().optional(),
				administeredByName: z.string().nullable().optional(),
				facility: z.string().nullable().optional(),
				expiryDate: z.string().nullable().optional(),
				adverseEvents: z.string().nullable().optional(),
				notes: z.string().nullable().optional()
			})
		})
	)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertImmunizationAccess(data.id, {
				expectedPatientId: data.patientId
			});
			const updated = await updateImmunization(data.id, data.expectedVersion, {
				...data.patch,
				updatedBy: context.user.id
			} as never);
			if (!updated) {
				throw new AppServerError("NOT_FOUND", "Immunization not found", 404);
			}
			queryCache.invalidateTag(`immunizations:patient:${data.patientId}`);
			return updated;
		} catch (err) {
			toAppServerError(err, "Failed to update immunization");
		}
	});
