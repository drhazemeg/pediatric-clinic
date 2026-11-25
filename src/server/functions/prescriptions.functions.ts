// src/server/functions/prescriptions.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { queryCache } from "@/db/cache";
import {
	countPrescriptionsForPatient,
	createPrescription,
	createPrescriptions,
	deletePrescription,
	findFormularyDrug,
	getPatientForPrescription,
	getPrescriptionById,
	getPrescriptionWithContext,
	getVisitForPrescription,
	listActivePrescriptionsForPatient,
	listOtherActivePrescriptions,
	listPrescriptionRegister,
	listPrescriptionsByPrescriber,
	listPrescriptionsForPatient,
	listPrescriptionsForVisit,
	renewPrescription,
	savePrescriptionTransactional,
	topMedicationsForClinic,
	updatePrescription
} from "@/db/queries/prescriptions.queries";
import { drugFormulary } from "@/db/schema";
import { toAppServerError } from "../fn-errors";
import {
	clinicalStaffMiddleware,
	patientAccessMiddleware,
	providerOrAdminMiddleware
} from "../fn-middleware";

const prescriptionStatusSchema = z.enum(["active", "completed", "cancelled"]);

const createPrescriptionRowSchema = z.object({
	visitId: z.string().min(1),
	patientId: z.string().min(1),
	prescribedById: z.string().min(1).nullable().optional(),
	medicationName: z.string().trim().min(1).max(200),
	dosage: z.string().trim().min(1).max(120),
	frequency: z.string().trim().min(1).max(120),
	durationDays: z.number().int().positive().max(365).nullable().optional(),
	instructions: z.string().trim().max(1000).nullable().optional(),
	prescribedAt: z.coerce.date().optional()
});

const updatePrescriptionRowSchema = z.object({
	id: z.string().min(1),
	patch: z.object({
		medicationName: z.string().trim().min(1).max(200).optional(),
		dosage: z.string().trim().min(1).max(120).optional(),
		frequency: z.string().trim().min(1).max(120).optional(),
		durationDays: z.number().int().positive().max(365).nullable().optional(),
		instructions: z.string().trim().max(1000).nullable().optional(),
		status: prescriptionStatusSchema.optional()
	})
});

const savePrescriptionTransactionalInputSchema = z.object({
	idempotencyKey: z.string().min(1).nullable().default(null),
	requestHash: z.string().min(1).nullable().default(null),
	prescriptionId: z.string().min(1).optional(),
	patientId: z.string().min(1),
	visitId: z.string().min(1),
	medicationName: z.string().trim().min(1).max(200),
	strength: z.number().positive(),
	unit: z.string().trim().min(1).max(64),
	frequency: z.string().trim().min(1).max(120),
	durationDays: z.number().int().positive().max(365).nullable(),
	instructions: z.string().trim().max(1000).nullable(),
	prescribedById: z.string().min(1).optional(),
	baseVersion: z.string().optional()
});

const registerSearchSchema = z.object({
	clinicId: z.string().min(1),
	q: z.string().trim().max(120).optional(),
	medication: z.string().trim().max(120).optional(),
	prescriberId: z.string().min(1).optional(),
	status: z.enum(["all", "active", "completed", "cancelled"]).default("all"),
	from: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	to: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	page: z.number().int().min(1).default(1),
	size: z.number().int().min(1).max(100).default(25)
});

function invalidatePrescriptionCache(patientId: string, visitId?: string) {
	queryCache.invalidateTag(`prescriptions:patient:${patientId}`);
	queryCache.invalidateTag("prescriptions:register");
	if (visitId) {
		queryCache.invalidateTag(`prescriptions:visit:${visitId}`);
	}
}

// ---------------------------------------------------------------------------
// Read Functions
// ---------------------------------------------------------------------------

export const getPrescriptionFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPrescriptionAccess(data.id);
			const row = await getPrescriptionById(data.id);
			if (!row) {
				throw new Error("Prescription not found");
			}
			return row;
		} catch (err) {
			toAppServerError(err, "Failed to load prescription");
		}
	});

export const getPrescriptionWithContextFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPrescriptionAccess(data.id);
			const ctx = await getPrescriptionWithContext(data.id);
			if (!ctx) {
				throw new Error("Prescription not found");
			}
			return ctx;
		} catch (err) {
			toAppServerError(err, "Failed to load prescription clinical context");
		}
	});

export const listVisitPrescriptionsFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(z.object({ visitId: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertVisitAccess(data.visitId);
			return await listPrescriptionsForVisit(data.visitId);
		} catch (err) {
			toAppServerError(err, "Failed to load visit prescriptions");
		}
	});

export const listPatientPrescriptionsFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(z.object({ patientId: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.patientId);
			return await listPrescriptionsForPatient(data.patientId);
		} catch (err) {
			toAppServerError(err, "Failed to load patient medication history");
		}
	});

export const listActivePatientPrescriptionsFn = createServerFn({
	method: "GET"
})
	.middleware([patientAccessMiddleware])
	.validator(z.object({ patientId: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.patientId);
			return await listActivePrescriptionsForPatient(data.patientId);
		} catch (err) {
			toAppServerError(err, "Failed to load active prescriptions");
		}
	});

export const listOtherActivePrescriptionsFn = createServerFn({
	method: "GET"
})
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			patientId: z.string().min(1),
			excludeId: z.string().min(1).optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.patientId);
			return await listOtherActivePrescriptions(data.patientId, data.excludeId);
		} catch (err) {
			toAppServerError(err, "Failed to check duplicate active prescriptions");
		}
	});

export const listPrescriptionsByPrescriberFn = createServerFn({
	method: "GET"
})
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			userId: z.string().min(1),
			limit: z.number().int().min(1).max(250).default(100)
		})
	)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertClinicUserAccess(data.userId);
			return await listPrescriptionsByPrescriber(data.userId, data.limit);
		} catch (err) {
			toAppServerError(err, "Failed to load prescriber history");
		}
	});

export const listPrescriptionRegisterFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(registerSearchSchema)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			const { clinicId, ...search } = data;
			return await listPrescriptionRegister(clinicId, search);
		} catch (err) {
			toAppServerError(err, "Failed to load prescription register");
		}
	});

export const getPatientAndVisitForPrescriptionFn = createServerFn({
	method: "GET"
})
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			clinicId: z.string().min(1),
			patientId: z.string().min(1),
			visitId: z.string().min(1).optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			await context.guard.assertPatientAccess(data.patientId, {
				expectedClinicId: data.clinicId
			});
			const patient = await getPatientForPrescription(
				data.patientId,
				data.clinicId
			);
			if (!patient) {
				throw new Error("Patient not found");
			}
			const visit = data.visitId
				? await getVisitForPrescription(
						data.visitId,
						data.patientId,
						data.clinicId
					)
				: null;

			return { patient, visit };
		} catch (err) {
			toAppServerError(err, "Failed to verify patient and visit context");
		}
	});

export const findFormularyDrugFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(z.object({ name: z.string().trim().min(1).max(200) }))
	.handler(async ({ data }) => {
		try {
			const drug = await findFormularyDrug(data.name);
			return drug === undefined ? undefined : JSON.parse(JSON.stringify(drug));
		} catch (err) {
			toAppServerError(err, "Failed to look up formulary drug");
		}
	});

export const searchDrugFormularyFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			query: z.string().trim().min(2).max(200),
			limit: z.number().int().min(1).max(50).default(10)
		})
	)
	.handler(async ({ data }) => {
		try {
			return await db
				.select({
					id: drugFormulary.id,
					genericName: drugFormulary.genericName,
					pharmacologicalCategory: drugFormulary.pharmacologicalCategory,
					atcCode: drugFormulary.atcCode,
					awareClassification: drugFormulary.awareClassification
				})
				.from(drugFormulary)
				.where(ilike(drugFormulary.genericName, `%${data.query}%`))
				.limit(data.limit);
		} catch (err) {
			toAppServerError(err, "Failed to search the drug formulary");
		}
	});

export const getDrugMonographFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(z.object({ drugId: z.string().min(1) }))
	.handler(async ({ data }) => {
		try {
			const [drug] = await db
				.select({
					id: drugFormulary.id,
					genericName: drugFormulary.genericName,
					pharmacologicalCategory: drugFormulary.pharmacologicalCategory,
					atcCode: drugFormulary.atcCode,
					awareClassification: drugFormulary.awareClassification,
					data: drugFormulary.data
				})
				.from(drugFormulary)
				.where(eq(drugFormulary.id, data.drugId))
				.limit(1);
			return drug ?? null;
		} catch (err) {
			toAppServerError(err, "Failed to load the drug monograph");
		}
	});

export const topMedicationsForClinicFn = createServerFn({ method: "GET" })
	.middleware([clinicalStaffMiddleware])
	.validator(
		z.object({
			clinicId: z.string().min(1),
			limit: z.number().int().min(1).max(100).default(20)
		})
	)
	.handler(async ({ data, context }) => {
		try {
			context.guard.assertClinicScope(data.clinicId);
			return await topMedicationsForClinic(data.clinicId, data.limit);
		} catch (err) {
			toAppServerError(err, "Failed to load top prescribed medications");
		}
	});

export const countPatientPrescriptionsFn = createServerFn({ method: "GET" })
	.middleware([patientAccessMiddleware])
	.validator(z.object({ patientId: z.string().min(1) }))
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPatientAccess(data.patientId);
			return await countPrescriptionsForPatient(data.patientId);
		} catch (err) {
			toAppServerError(err, "Failed to count patient prescriptions");
		}
	});

// ---------------------------------------------------------------------------
// Mutation Functions
// ---------------------------------------------------------------------------

export const createPrescriptionRecordFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(createPrescriptionRowSchema)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertVisitAccess(data.visitId, {
				expectedPatientId: data.patientId
			});
			const row = await createPrescription({
				...data,
				prescribedById: context.user.id
			});
			if (row) {
				invalidatePrescriptionCache(row.patientId, row.visitId);
			}
			return row;
		} catch (err) {
			toAppServerError(err, "Failed to create prescription");
		}
	});

export const createPrescriptionBatchFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(
		z.object({
			rows: z.array(createPrescriptionRowSchema).min(1)
		})
	)
	.handler(async ({ data, context }) => {
		try {
			const checkedPairs = new Map<string, string>();
			for (const r of data.rows) {
				const key = `${r.visitId}:${r.patientId}`;
				if (!checkedPairs.has(key)) {
					checkedPairs.set(key, r.visitId);
				}
			}
			await Promise.all(
				Array.from(checkedPairs.keys(), key => {
					const [visitId, patientId] = key.split(":");
					return context.guard.assertVisitAccess(visitId, {
						expectedPatientId: patientId
					});
				})
			);
			const rows = await createPrescriptions(
				data.rows.map(r => ({
					...r,
					prescribedById: context.user.id
				}))
			);
			for (const r of rows) {
				invalidatePrescriptionCache(r.patientId, r.visitId);
			}
			return rows;
		} catch (err) {
			toAppServerError(err, "Failed to create prescriptions batch");
		}
	});

export const createPrescriptionsBatchFn = createPrescriptionBatchFn;

export const savePrescriptionTransactionalFn = createServerFn({
	method: "POST"
})
	.middleware([providerOrAdminMiddleware])
	.validator(savePrescriptionTransactionalInputSchema)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertVisitAccess(data.visitId, {
				expectedPatientId: data.patientId
			});
			if (data.prescriptionId) {
				await context.guard.assertPrescriptionAccess(data.prescriptionId, {
					expectedPatientId: data.patientId,
					expectedVisitId: data.visitId
				});
			}
			const saved = await savePrescriptionTransactional({
				...data,
				actorId: context.user.id,
				prescribedById: context.user.id
			});
			invalidatePrescriptionCache(saved.patientId, saved.visitId);
			return saved;
		} catch (err) {
			if (
				typeof err === "object" &&
				err !== null &&
				"status" in err &&
				(err as { status?: unknown }).status === 409
			) {
				throw new Error(
					err instanceof Error ? err.message : "Prescription conflict"
				);
			}
			toAppServerError(err, "Failed to save prescription transactionally");
		}
	});

export const updatePrescriptionFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(updatePrescriptionRowSchema)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPrescriptionAccess(data.id);
			const row = await updatePrescription(data.id, data.patch);
			if (!row) {
				throw new Error("Prescription not found");
			}
			invalidatePrescriptionCache(row.patientId, row.visitId);
			return row;
		} catch (err) {
			toAppServerError(err, "Failed to update prescription");
		}
	});

export const renewPrescriptionFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(
		z.object({
			id: z.string().min(1),
			prescribedById: z.string().min(1).nullable().optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			await context.guard.assertPrescriptionAccess(data.id);
			const renewed = await renewPrescription(data.id, context.user.id);
			if (renewed) {
				invalidatePrescriptionCache(renewed.patientId, renewed.visitId);
			}
			return renewed;
		} catch (err) {
			toAppServerError(err, "Failed to renew prescription");
		}
	});

export const deletePrescriptionFn = createServerFn({ method: "POST" })
	.middleware([providerOrAdminMiddleware])
	.validator(
		z.object({
			id: z.string().min(1),
			patientId: z.string().min(1).optional(),
			visitId: z.string().min(1).optional()
		})
	)
	.handler(async ({ data, context }) => {
		try {
			const existing = await context.guard.assertPrescriptionAccess(data.id, {
				expectedPatientId: data.patientId,
				expectedVisitId: data.visitId
			});
			await deletePrescription(data.id);
			invalidatePrescriptionCache(existing.patientId, existing.visitId);
			return { deleted: true as const, id: data.id };
		} catch (err) {
			toAppServerError(err, "Failed to delete prescription");
		}
	});
