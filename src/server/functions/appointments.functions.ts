// src/server/functions/appointments.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { queryCache } from "@/db/cache";
import {
	countAppointmentsByStatus,
	createAppointment,
	deleteAppointment,
	getAppointmentById,
	listAppointmentsForPatient,
	listAppointmentsInRange,
	listTodayAppointmentsForClinic,
	listUpcomingForDoctor,
	markCancelled,
	markCompleted,
	markNoShow,
	updateAppointment
} from "@/db/queries/appointments.queries";
import { AppServerError, toAppServerError } from "../fn-errors";
import {
	adminOnlyMiddleware,
	clinicalStaffMiddleware,
	patientAccessMiddleware
} from "../fn-middleware";

const appointmentStatusSchema = z.enum([
	"scheduled",
	"completed",
	"cancelled",
	"no-show"
]);

const createAppointmentSchema = z.object({
	patientId: z.string().min(1),
	clinicId: z.string().min(1),
	doctorId: z.string().min(1).nullable().optional(),
	scheduledAt: z.coerce.date(),
	durationMinutes: z.number().int().min(5).max(240).default(15),
	status: appointmentStatusSchema.default("scheduled"),
	reason: z.string().max(500).nullable().optional(),
	notes: z.string().max(2000).nullable().optional()
});

const updateAppointmentSchema = z.object({
	id: z.string().min(1),
	scheduledAt: z.coerce.date().optional(),
	durationMinutes: z.number().int().min(5).max(240).optional(),
	status: appointmentStatusSchema.optional(),
	reason: z.string().max(500).nullable().optional(),
	notes: z.string().max(2000).nullable().optional(),
	doctorId: z.string().min(1).nullable().optional()
});

function invalidateAppointmentCache(clinicId: string, patientId?: string) {
	queryCache.invalidateTag(`appointments:clinic:${clinicId}`);
	if (patientId) {
		queryCache.invalidateTag(`appointments:patient:${patientId}`);
	}
}

export const getAppointmentFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertAppointmentAccess(data.id);
			const appointment = await getAppointmentById(data.id);
			if (!appointment) {
				throw new AppServerError("NOT_FOUND", "Appointment not found", 404);
			}
			return appointment;
		} catch (err) {
			toAppServerError(err, "Failed to load appointment");
		}
	});

export const listTodayClinicAppointmentsFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			clinicId: z.string().min(1),
			dateIso: z.string().optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			const refDate = data.dateIso ? new Date(data.dateIso) : new Date();
			return await listTodayAppointmentsForClinic(data.clinicId, refDate);
		} catch (err) {
			toAppServerError(err, "Failed to load today's appointments");
		}
	});

export const listPatientAppointmentsFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(
		z.object({
			patientId: z.string().min(1),
			status: appointmentStatusSchema.optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.patientId);
			return await listAppointmentsForPatient(data.patientId, data.status);
		} catch (err) {
			toAppServerError(err, "Failed to load patient appointments");
		}
	});

export const listRangeAppointmentsFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			clinicId: z.string().min(1),
			from: z.coerce.date(),
			to: z.coerce.date(),
			doctorId: z.string().min(1).optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await listAppointmentsInRange(
				data.clinicId,
				data.from,
				data.to,
				data.doctorId
			);
		} catch (err) {
			toAppServerError(err, "Failed to load appointments in range");
		}
	});

export const listDoctorUpcomingAppointmentsFn = createServerFn({
	method: "GET"
})
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			doctorId: z.string().min(1),
			limit: z.number().int().min(1).max(200).default(50)
		})
	)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertClinicUserAccess(data.doctorId);
			return await listUpcomingForDoctor(data.doctorId, data.limit);
		} catch (err) {
			toAppServerError(err, "Failed to load upcoming doctor appointments");
		}
	});

export const getAppointmentStatusCountsFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			clinicId: z.string().min(1),
			from: z.coerce.date(),
			to: z.coerce.date()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await countAppointmentsByStatus(data.clinicId, data.from, data.to);
		} catch (err) {
			toAppServerError(err, "Failed to count appointments by status");
		}
	});

export const createAppointmentFn = createServerFn({ method: "POST" })
	.middleware([clinicalStaffMiddleware])
	.validator(createAppointmentSchema)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			await context.guard.assertPatientAccess(data.patientId, {
				expectedClinicId: data.clinicId
			});
			const created = await createAppointment(data);
			invalidateAppointmentCache(data.clinicId, data.patientId);
			return created;
		} catch (err) {
			toAppServerError(err, "Failed to create appointment");
		}
	});

export const updateAppointmentFn = createServerFn({ method: "POST" })
	.middleware([clinicalStaffMiddleware])
	.validator(updateAppointmentSchema)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertAppointmentAccess(data.id);
			const { id, ...patch } = data;
			const updated = await updateAppointment(id, patch);
			if (!updated) {
				throw new AppServerError("NOT_FOUND", "Appointment not found", 404);
			}
			invalidateAppointmentCache(updated.clinicId, updated.patientId);
			return updated;
		} catch (err) {
			toAppServerError(err, "Failed to update appointment");
		}
	});

export const transitionAppointmentStatusFn = createServerFn({ method: "POST" })
	.middleware([patientAccessMiddleware])
	.validator(
		z.object({
			id: z.string().min(1),
			action: z.enum(["complete", "cancel", "no-show"])
		})
	)
	.handler(async ({ data, context }) => {
		try {
			if (
				(context.user.role === "guardian" || context.user.role === "patient") &&
				data.action !== "cancel"
			) {
				throw new AppServerError(
					"FORBIDDEN",
					"You do not have permission to perform this action",
					403
				);
			}
			await context.guard.assertAppointmentAccess(data.id);
			const row =
				data.action === "complete"
					? await markCompleted(data.id)
					: data.action === "cancel"
						? await markCancelled(data.id)
						: await markNoShow(data.id);

			if (!row) {
				throw new AppServerError("NOT_FOUND", "Appointment not found", 404);
			}
			invalidateAppointmentCache(row.clinicId, row.patientId);
			return row;
		} catch (err) {
			toAppServerError(err, "Failed to update appointment status");
		}
	});

export const deleteAppointmentFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			const existing = await context.guard.assertAppointmentAccess(data.id);
			await deleteAppointment(data.id);
			invalidateAppointmentCache(existing.clinicId, existing.patientId);
			return { deleted: true as const, id: data.id };
		} catch (err) {
			toAppServerError(err, "Failed to delete appointment");
		}
	});
