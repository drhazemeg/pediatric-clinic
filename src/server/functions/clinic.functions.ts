// src/server/functions/clinic.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { queryCache } from "@/db/cache";
import {
	countClinics,
	createClinic,
	deleteClinic,
	getClinicById,
	getClinicWithRoster,
	getClinicWithStats,
	listClinics,
	updateClinic
} from "@/db/queries/clinic.queries";
import { AppServerError, toAppServerError } from "../fn-errors";
import { adminOnlyMiddleware, clinicalStaffMiddleware } from "../fn-middleware";

const createClinicSchema = z.object({
	name: z.string().trim().min(1).max(200),
	address: z.string().trim().max(500).nullable().optional(),
	phone: z.string().trim().max(40).nullable().optional(),
	email: z.string().trim().email().max(200).nullable().optional()
});

const updateClinicSchema = createClinicSchema.partial().extend({
	id: z.string().min(1)
});

export const listClinicsFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.handler(async ({ context }) => {
		try {
			if (context.user.role === "admin") {
				return await listClinics();
			}
			const clinicId = context.guard.resolveClinicId(undefined);
			if (!clinicId) return [];
			const clinic = await getClinicById(clinicId);
			return clinic ? [clinic] : [];
		} catch (err) {
			toAppServerError(err, "Failed to list clinics");
		}
	});

export const getClinicFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.id, "Clinic");
			const clinic = await getClinicById(data.id);
			if (!clinic) {
				throw new AppServerError("NOT_FOUND", "Clinic not found", 404);
			}
			return clinic;
		} catch (err) {
			toAppServerError(err, "Failed to load clinic");
		}
	});

export const getClinicStatsFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(z.object({ clinicId: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId, "Clinic");
			const stats = await getClinicWithStats(data.clinicId);
			if (!stats) {
				throw new AppServerError("NOT_FOUND", "Clinic not found", 404);
			}
			return stats;
		} catch (err) {
			toAppServerError(err, "Failed to load clinic statistics");
		}
	});

export const getClinicRosterFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(z.object({ clinicId: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId, "Clinic");
			const roster = await getClinicWithRoster(data.clinicId);
			if (!roster) {
				throw new AppServerError("NOT_FOUND", "Clinic not found", 404);
			}
			return roster;
		} catch (err) {
			toAppServerError(err, "Failed to load clinic roster");
		}
	});

export const countClinicsFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.handler(async ({ context }) => {
		try {
			if (context.user.role === "admin") {
				return await countClinics();
			}
			const clinicId = context.guard.resolveClinicId(undefined);
			if (!clinicId) return 0;
			const clinic = await getClinicById(clinicId);
			return clinic ? 1 : 0;
		} catch (err) {
			toAppServerError(err, "Failed to count clinics");
		}
	});

export const createClinicFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(createClinicSchema)
	.handler(async ({ data }) => {
		try {
			const row = await createClinic(data as never);
			queryCache.invalidateTag("clinics");
			return row;
		} catch (err) {
			toAppServerError(err, "Failed to create clinic");
		}
	});

export const updateClinicFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(updateClinicSchema)
	.handler(async ({ data }) => {
		try {
			const { id, ...patch } = data;
			const row = await updateClinic(id, patch);
			if (!row) {
				throw new Error("Clinic not found");
			}
			queryCache.invalidateTag("clinics");
			queryCache.invalidateTag(`clinic:${id}`);
			return row;
		} catch (err) {
			toAppServerError(err, "Failed to update clinic");
		}
	});

export const deleteClinicFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		try {
			await deleteClinic(data.id);
			queryCache.invalidateTag("clinics");
			queryCache.invalidateTag(`clinic:${data.id}`);
			return { deleted: true as const, id: data.id };
		} catch (err) {
			toAppServerError(err, "Failed to delete clinic");
		}
	});
