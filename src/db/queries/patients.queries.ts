// src/features/patients/queries.ts
//
// Moved verbatim from `src/server/db/queries/patient.queries.ts`.
// Only imports changed:
//   @/lib/db            → @/server/db
//   @/lib/db/schema     → ./schema (patients) / @/server/db/schema (visits, etc.)
//
// TODO: clinics: import from `@/features/clinics/schema` once it exists.

import { and, eq, ilike, isNull, like, or, sql } from "drizzle-orm";
import { db } from "..";
import { guardianLinks, patients } from "../schema";
import type { NewPatient } from "../schema/types";

// Every read excludes soft-deleted rows (`deleted_at IS NULL`). `deletePatient`
// only sets that column, so history is preserved for audit rather than being
// cascade-deleted with the patient.
const activeOnly = { deletedAt: { isNull: true } } as const;

export async function getPatientById(id: string) {
	return db.query.patients.findFirst({ where: { id, ...activeOnly } });
}

export async function getPatientByMrn(clinicId: string, mrn: string) {
	return db.query.patients.findFirst({
		where: { clinicId, mrn, ...activeOnly }
	});
}

export async function listPatientsByClinic(clinicId: string) {
	return db.query.patients.findMany({
		where: { clinicId, ...activeOnly },
		orderBy: (t, { asc }) => [asc(t.lastName), asc(t.firstName)]
	});
}

export async function searchPatients(clinicId: string, q: string) {
	const needle = `%${q.toLowerCase()}%`;
	return db.query.patients.findMany({
		where: {
			clinicId,
			...activeOnly,
			OR: [
				{ firstName: { like: needle } },
				{ lastName: { like: needle } },
				{ mrn: { like: `%${q}%` } }
			]
		},
		orderBy: { lastName: "asc", firstName: "asc" },
		limit: 50
	});
}

export async function searchPatientsForMcp(
	clinicId: string,
	query: string,
	limit: number
) {
	const needle = `%${query.trim()}%`;
	return db
		.select({
			id: patients.id,
			mrn: patients.mrn,
			firstName: patients.firstName,
			lastName: patients.lastName,
			sex: patients.sex,
			dateOfBirth: patients.dateOfBirth
		})
		.from(patients)
		.where(
			and(
				eq(patients.clinicId, clinicId),
				isNull(patients.deletedAt),
				or(
					ilike(patients.firstName, needle),
					ilike(patients.lastName, needle),
					ilike(patients.mrn, needle)
				)
			)
		)
		.orderBy(patients.lastName, patients.firstName)
		.limit(limit);
}

export async function getPatientWithHistory(patientId: string) {
	return db.query.patients.findFirst({
		where: { id: patientId, ...activeOnly },
		with: {
			visits: {
				orderBy: (t, { asc }) => [asc(t.visitedAt)],
				with: {
					measurements: {
						orderBy: (t, { asc }) => [asc(t.indicator)]
					}
				}
			}
		}
	});
}

export async function getPatientSummary(patientId: string) {
	return db.query.patients.findFirst({
		where: { id: patientId, ...activeOnly },
		columns: {
			id: true,
			mrn: true,
			firstName: true,
			lastName: true,
			sex: true,
			dateOfBirth: true
		},
		extras: {
			fullName: (t, { sql: dbSql }) =>
				dbSql<string>`${t.firstName} || ' ' || ${t.lastName}`
		}
	});
}

/**
 * Composer-shaped patient: fields a measurement / prescription form needs.
 * Falls back to the most recent weight measurement when `patients.weightKg`
 * isn't populated.
 */
export async function getPatientForComposer(patientId: string) {
	const patient = await db.query.patients.findFirst({
		where: { id: patientId, ...activeOnly },
		columns: {
			id: true,
			mrn: true,
			firstName: true,
			lastName: true,
			sex: true,
			dateOfBirth: true,
			allergies: true,
			weightKg: true,
			gestationalAgeWeeks: true,
			clinicId: true
		}
	});
	if (!patient) return null;

	if (patient.weightKg == null) {
		const latest = await db.query.measurements.findFirst({
			where: { patientId, indicator: "weight-for-age" },
			orderBy: { measuredAt: "desc" },
			columns: { value: true }
		});
		return { ...patient, weightKg: latest?.value ?? null };
	}
	return patient;
}

export async function getFullPatientChart(patientId: string) {
	return db.query.patients.findFirst({
		where: { id: patientId, ...activeOnly },
		with: {
			clinic: true,
			visits: {
				orderBy: (t, { desc }) => [desc(t.visitedAt)],
				with: {
					measurements: {
						orderBy: (t, { asc }) => [asc(t.indicator)]
					},
					diagnoses: true,
					prescriptions: true,
					doctor: { columns: { id: true, name: true } }
				}
			},
			medicalNotes: {
				orderBy: (t, { desc }) => [desc(t.createdAt)],
				limit: 20,
				with: { author: { columns: { id: true, name: true } } }
			},
			appointments: {
				where: { scheduledAt: { gte: new Date() } },
				orderBy: (t, { asc }) => [asc(t.scheduledAt)],
				limit: 5
			}
		}
	});
}

// --- Update / delete ------------------------------------------------------

export async function updatePatient(
	id: string,
	patch: Partial<Omit<typeof patients.$inferInsert, "id">>,
	baseVersion?: string
) {
	if (baseVersion === undefined) {
		const [row] = await db
			.update(patients)
			.set(patch)
			.where(eq(patients.id, id))
			.returning();
		return row ?? null;
	}

	// Compare-and-swap on `updated_at`. A stale `baseVersion` matches no row,
	// so a concurrent edit can never silently clobber the newer one.
	const [row] = await db
		.update(patients)
		.set(patch)
		.where(
			and(eq(patients.id, id), eq(patients.updatedAt, new Date(baseVersion)))
		)
		.returning();
	return row ?? null;
}

export async function updatePatientWeight(patientId: string, weightKg: number) {
	const [row] = await db
		.update(patients)
		.set({ weightKg })
		.where(eq(patients.id, patientId))
		.returning({ weightKg: patients.weightKg });
	return row ?? null;
}

export async function deletePatient(id: string) {
	// Soft delete: keep the row and its clinical history for audit/retention
	// instead of cascade-deleting visits, measurements and prescriptions.
	await db
		.update(patients)
		.set({ deletedAt: new Date(), isActive: false })
		.where(eq(patients.id, id));
}

// --- Aggregates -----------------------------------------------------------

export async function countPatientsByClinic(clinicId: string) {
	const [row] = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(patients)
		.where(and(eq(patients.clinicId, clinicId), isNull(patients.deletedAt)));
	return row?.count ?? 0;
}
export async function getPatientWithVisits(patientId: string) {
	return await db.query.patients.findFirst({
		where: { id: patientId, ...activeOnly },
		with: {
			visits: {
				with: {
					measurements: true
				},
				orderBy: { visitedAt: "asc" } // Chronological order for charts
			}
		}
	});
}

// --- Create ---

function extractPgErrorCode(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null) return undefined;
	const err = error as { code?: unknown; cause?: unknown };
	if (typeof err.code === "string") return err.code;
	if (typeof err.cause === "object" && err.cause !== null) {
		const causeCode = (err.cause as { code?: unknown }).code;
		if (typeof causeCode === "string") return causeCode;
	}
	return undefined;
}

function isUniqueViolation(error: unknown): boolean {
	const code = extractPgErrorCode(error);
	if (code === "23505") return true;
	const message =
		typeof error === "object" && error !== null && "message" in error
			? String((error as { message?: unknown }).message ?? "")
			: "";
	return /unique constraint|duplicate key value/i.test(message);
}

export async function createPatient(input: NewPatient) {
	const year = new Date().getFullYear();
	const prefix = `MRN-${year}-`;
	const mrnSuffix = sql<number>`COALESCE(NULLIF(substring(${patients.mrn} from ${prefix.length + 1}), ''), '0')::int`;

	const clinicCondition =
		input.clinicId != null
			? eq(patients.clinicId, input.clinicId)
			: isNull(patients.clinicId);

	for (let attempt = 0; attempt < 5; attempt++) {
		const [row] = await db
			.select({
				max: sql<number>`COALESCE(MAX(${mrnSuffix}), 0)::int`
			})
			.from(patients)
			.where(and(clinicCondition, like(patients.mrn, `${prefix}%`)));

		const next = (row?.max ?? 0) + 1;
		const mrn = `${prefix}${String(next).padStart(3, "0")}`;

		try {
			const [created] = await db
				.insert(patients)
				.values({ ...input, mrn })
				.returning();
			return created;
		} catch (err) {
			if (!isUniqueViolation(err)) {
				throw err;
			}
		}
	}

	throw new Error("Could not allocate a unique MRN after retries");
}
// --- Read ---

/**
 * Patients with no visit in the last `months` months — "lost to follow-up" report.
 */
export async function listLapsedPatients(clinicId: string, months = 6) {
	const cutoff = new Date();
	cutoff.setMonth(cutoff.getMonth() - months);

	return db.query.patients.findMany({
		where: {
			clinicId,
			...activeOnly,
			NOT: {
				visits: {
					visitedAt: { gte: cutoff }
				}
			}
		},
		orderBy: (t, { asc }) => [asc(t.lastName), asc(t.firstName)],
		with: {
			visits: {
				orderBy: (t, { desc }) => [desc(t.visitedAt)],
				limit: 1,
				columns: { visitedAt: true }
			}
		}
	});
}

/**
 * Patients seen within a date window — for reporting.
 */
export async function listPatientsSeenBetween(
	clinicId: string,
	from: Date,
	to: Date
) {
	return db.query.patients.findMany({
		where: {
			clinicId,
			...activeOnly,
			visits: {
				visitedAt: { gte: from, lte: to }
			}
		},
		orderBy: (t, { asc }) => [asc(t.lastName)],
		with: {
			visits: {
				where: { visitedAt: { gte: from, lte: to } },
				columns: { visitedAt: true }
			}
		}
	});
}

export async function countLapsedPatients(
	clinicId: string,
	cutoff: Date
): Promise<number> {
	// Correlated subquery: patients with no visit after `cutoff`
	const [row] = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(patients)
		.where(
			and(
				eq(patients.clinicId, clinicId),
				isNull(patients.deletedAt),
				sql`NOT EXISTS (
					SELECT 1 FROM visits v
					WHERE v.patient_id = ${patients.id}
					  AND v.visited_at >= ${cutoff.getTime()}
				)`
			)
		);
	return row?.count ?? 0;
}

export async function linkGuardian(data: {
	userId: string;
	patientId: string;
	relation: string;
	guardianName: string;
	phone: string;
	isPrimary?: boolean;
}) {
	return db
		.insert(guardianLinks)
		.values({
			userId: data.userId,
			patientId: data.patientId,
			guardianName: data.guardianName,
			phone: data.phone,
			relation: data.relation,
			isPrimary: data.isPrimary ?? false
		})
		.onConflictDoUpdate({
			target: [guardianLinks.userId, guardianLinks.patientId],
			set: {
				relation: data.relation,
				isPrimary: data.isPrimary ?? false
			}
		});
}

export async function unlinkGuardian(userId: string, patientId: string) {
	await db
		.delete(guardianLinks)
		.where(
			and(
				eq(guardianLinks.userId, userId),
				eq(guardianLinks.patientId, patientId)
			)
		);
}

export async function getGuardiansForPatient(patientId: string) {
	return db.query.guardianLinks.findMany({
		where: { patientId },
		with: { user: true }
	});
}
