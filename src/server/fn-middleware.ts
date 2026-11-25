// src/server/fn-middleware.ts
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, db, eq, isNull } from "@/db";
import {
	appointments,
	clinicQueue,
	diagnoses,
	guardianLinks,
	immunizations,
	measurements,
	patients,
	prescriptions,
	user as userTable,
	visits
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { type Role, USER_ROLES, userRoleSchema } from "@/lib/auth/role";
import { AppServerError } from "./fn-errors";

export type UserRole = Role;

export interface SessionUser {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	clinicId: string | null;
}

export interface SessionContext {
	user: SessionUser;
}

export interface ScopedPatientRecord {
	id: string;
	clinicId: string | null;
}

export interface ScopedVisitRecord {
	id: string;
	patientId: string;
	clinicId: string;
}

export interface ScopedAppointmentRecord {
	id: string;
	patientId: string;
	clinicId: string;
	doctorId: string | null;
	status: string;
}

export interface ScopedDiagnosisRecord {
	id: string;
	visitId: string;
	patientId: string;
	clinicId: string;
}

export interface ScopedMeasurementRecord {
	id: string;
	visitId: string;
	patientId: string;
	clinicId: string;
}

export interface ScopedPrescriptionRecord {
	id: string;
	visitId: string;
	patientId: string;
	prescribedById: string | null;
	clinicId: string;
}

export interface ScopedImmunizationRecord {
	id: string;
	patientId: string;
	clinicId: string | null;
}

export interface ScopedQueueEntryRecord {
	id: string;
	clinicId: string;
	patientId: string;
}

export interface ScopedSessionContext extends SessionContext {
	guard: ScopedGuard;
}

export interface ScopedPatientRecord {
	id: string;
	clinicId: string | null;
}

export interface ScopedVisitRecord {
	id: string;
	patientId: string;
	clinicId: string;
}

export interface ScopedAppointmentRecord {
	id: string;
	patientId: string;
	clinicId: string;
	doctorId: string | null;
	status: string;
}

export interface ScopedDiagnosisRecord {
	id: string;
	visitId: string;
	patientId: string;
	clinicId: string;
}

export interface ScopedMeasurementRecord {
	id: string;
	visitId: string;
	patientId: string;
	clinicId: string;
}

export interface ScopedPrescriptionRecord {
	id: string;
	visitId: string;
	patientId: string;
	prescribedById: string | null;
	clinicId: string;
}

export interface ScopedImmunizationRecord {
	id: string;
	patientId: string;
	clinicId: string | null;
}

export interface ScopedQueueEntryRecord {
	id: string;
	clinicId: string;
	patientId: string;
}

export type ScopedGuard = ReturnType<typeof createScopedGuard>;

export interface ScopedSessionContext extends SessionContext {
	guard: ScopedGuard;
}

export function isAdminRole(role: UserRole): boolean {
	return role === "admin";
}

export function isGuardianOrPatientRole(role: UserRole): boolean {
	return role === "guardian" || role === "patient";
}

/**
 * Verify a non-admin user can access the target `clinicId`.
 * Non-admin users without an assigned `session.user.clinicId` are always rejected.
 */
export function assertClinicScope(
	user: SessionUser,
	targetClinicId: string | null | undefined,
	resource = "Clinic"
): void {
	if (isAdminRole(user.role)) {
		return;
	}
	if (!user.clinicId) {
		throw new AppServerError(
			"FORBIDDEN",
			"User is not assigned to a clinic",
			403
		);
	}
	if (!targetClinicId || targetClinicId !== user.clinicId) {
		throw new AppServerError(
			"FORBIDDEN",
			`You do not have access to this ${resource.toLowerCase()}`,
			403
		);
	}
}

/**
 * Resolve the clinicId for create mutations where `clinicId` may be optional.
 * Non-admin users default to their own `session.user.clinicId` and cannot specify another clinic.
 */
export function resolveScopedClinicId(
	user: SessionUser,
	requestedClinicId: string | null | undefined
): string | null | undefined {
	if (isAdminRole(user.role)) {
		return requestedClinicId;
	}
	if (!user.clinicId) {
		throw new AppServerError(
			"FORBIDDEN",
			"User is not assigned to a clinic",
			403
		);
	}
	if (requestedClinicId && requestedClinicId !== user.clinicId) {
		throw new AppServerError(
			"FORBIDDEN",
			"You do not have access to this clinic",
			403
		);
	}
	return user.clinicId;
}

/**
 * Verify access to a patient record:
 * - `admin`: full access
 * - `doctor` / `staff`: patient must belong to `user.clinicId`
 * - `guardian` / `patient`: must be linked via `guardian_links` (or matching user/patient id)
 *   and match `user.clinicId` when set on the user session.
 */
export async function assertPatientAccess(
	user: SessionUser,
	patientId: string,
	options?: { expectedClinicId?: string }
): Promise<ScopedPatientRecord> {
	const [patient] = await db
		.select({
			id: patients.id,
			clinicId: patients.clinicId
		})
		.from(patients)
		.where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
		.limit(1);

	if (!patient) {
		throw new AppServerError("NOT_FOUND", "Patient not found", 404);
	}

	if (
		options?.expectedClinicId &&
		patient.clinicId !== options.expectedClinicId
	) {
		throw new AppServerError(
			"FORBIDDEN",
			"Patient does not belong to the specified clinic",
			403
		);
	}

	if (isAdminRole(user.role)) {
		return patient;
	}

	if (isGuardianOrPatientRole(user.role)) {
		if (user.clinicId && patient.clinicId !== user.clinicId) {
			throw new AppServerError(
				"FORBIDDEN",
				"You do not have access to this patient",
				403
			);
		}
		if (patient.id !== user.id) {
			const [link] = await db
				.select({ userId: guardianLinks.userId })
				.from(guardianLinks)
				.where(
					and(
						eq(guardianLinks.userId, user.id),
						eq(guardianLinks.patientId, patient.id)
					)
				)
				.limit(1);

			if (!link) {
				throw new AppServerError(
					"FORBIDDEN",
					"You do not have access to this patient",
					403
				);
			}
		}
		return patient;
	}

	assertClinicScope(user, patient.clinicId, "Patient");
	return patient;
}

/**
 * Verify access to a visit record (and optional patient/clinic consistency).
 */
export async function assertVisitAccess(
	user: SessionUser,
	visitId: string,
	options?: { expectedPatientId?: string; expectedClinicId?: string }
): Promise<ScopedVisitRecord> {
	const [visit] = await db
		.select({
			id: visits.id,
			patientId: visits.patientId,
			clinicId: visits.clinicId
		})
		.from(visits)
		.where(eq(visits.id, visitId))
		.limit(1);

	if (!visit) {
		throw new AppServerError("NOT_FOUND", "Visit not found", 404);
	}

	if (
		options?.expectedPatientId &&
		visit.patientId !== options.expectedPatientId
	) {
		throw new AppServerError(
			"FORBIDDEN",
			"Visit does not belong to the specified patient",
			403
		);
	}

	if (
		options?.expectedClinicId &&
		visit.clinicId !== options.expectedClinicId
	) {
		throw new AppServerError(
			"FORBIDDEN",
			"Visit does not belong to the specified clinic",
			403
		);
	}

	if (isAdminRole(user.role)) {
		return visit;
	}

	if (isGuardianOrPatientRole(user.role)) {
		if (user.clinicId && visit.clinicId !== user.clinicId) {
			throw new AppServerError(
				"FORBIDDEN",
				"You do not have access to this visit",
				403
			);
		}
		await assertPatientAccess(user, visit.patientId);
		return visit;
	}

	assertClinicScope(user, visit.clinicId, "Visit");
	return visit;
}

/**
 * Verify access to an appointment record.
 */
export async function assertAppointmentAccess(
	user: SessionUser,
	appointmentId: string
): Promise<ScopedAppointmentRecord> {
	const [appointment] = await db
		.select({
			id: appointments.id,
			patientId: appointments.patientId,
			clinicId: appointments.clinicId,
			doctorId: appointments.doctorId,
			status: appointments.status
		})
		.from(appointments)
		.where(eq(appointments.id, appointmentId))
		.limit(1);

	if (!appointment) {
		throw new AppServerError("NOT_FOUND", "Appointment not found", 404);
	}

	if (isAdminRole(user.role)) {
		return appointment;
	}

	if (isGuardianOrPatientRole(user.role)) {
		if (user.clinicId && appointment.clinicId !== user.clinicId) {
			throw new AppServerError(
				"FORBIDDEN",
				"You do not have access to this appointment",
				403
			);
		}
		await assertPatientAccess(user, appointment.patientId);
		return appointment;
	}

	assertClinicScope(user, appointment.clinicId, "Appointment");
	return appointment;
}

/**
 * Verify access to a diagnosis record via its parent visit/patient.
 */
export async function assertDiagnosisAccess(
	user: SessionUser,
	diagnosisId: string,
	options?: { expectedVisitId?: string }
): Promise<ScopedDiagnosisRecord> {
	const [row] = await db
		.select({
			id: diagnoses.id,
			visitId: diagnoses.visitId,
			patientId: visits.patientId,
			clinicId: visits.clinicId
		})
		.from(diagnoses)
		.innerJoin(visits, eq(diagnoses.visitId, visits.id))
		.where(eq(diagnoses.id, diagnosisId))
		.limit(1);

	if (!row) {
		throw new AppServerError("NOT_FOUND", "Diagnosis not found", 404);
	}

	if (options?.expectedVisitId && row.visitId !== options.expectedVisitId) {
		throw new AppServerError(
			"FORBIDDEN",
			"Diagnosis does not belong to the specified visit",
			403
		);
	}

	if (isAdminRole(user.role)) {
		return row;
	}

	if (isGuardianOrPatientRole(user.role)) {
		if (user.clinicId && row.clinicId !== user.clinicId) {
			throw new AppServerError(
				"FORBIDDEN",
				"You do not have access to this diagnosis",
				403
			);
		}
		await assertPatientAccess(user, row.patientId);
		return row;
	}

	assertClinicScope(user, row.clinicId, "Diagnosis");
	return row;
}

/**
 * Verify access to a measurement record via its parent visit/patient.
 */
export async function assertMeasurementAccess(
	user: SessionUser,
	measurementId: string,
	options?: { expectedPatientId?: string }
): Promise<ScopedMeasurementRecord> {
	const [row] = await db
		.select({
			id: measurements.id,
			visitId: measurements.visitId,
			patientId: measurements.patientId,
			clinicId: visits.clinicId
		})
		.from(measurements)
		.innerJoin(visits, eq(measurements.visitId, visits.id))
		.where(eq(measurements.id, measurementId))
		.limit(1);

	if (!row) {
		throw new AppServerError("NOT_FOUND", "Measurement not found", 404);
	}

	if (
		options?.expectedPatientId &&
		row.patientId !== options.expectedPatientId
	) {
		throw new AppServerError(
			"FORBIDDEN",
			"Measurement does not belong to the specified patient",
			403
		);
	}

	if (isAdminRole(user.role)) {
		return row;
	}

	if (isGuardianOrPatientRole(user.role)) {
		if (user.clinicId && row.clinicId !== user.clinicId) {
			throw new AppServerError(
				"FORBIDDEN",
				"You do not have access to this measurement",
				403
			);
		}
		await assertPatientAccess(user, row.patientId);
		return row;
	}

	assertClinicScope(user, row.clinicId, "Measurement");
	return row;
}

/**
 * Verify access to a prescription record via its parent visit/patient.
 */
export async function assertPrescriptionAccess(
	user: SessionUser,
	prescriptionId: string,
	options?: { expectedPatientId?: string; expectedVisitId?: string }
): Promise<ScopedPrescriptionRecord> {
	const [row] = await db
		.select({
			id: prescriptions.id,
			visitId: prescriptions.visitId,
			patientId: prescriptions.patientId,
			prescribedById: prescriptions.prescribedById,
			clinicId: visits.clinicId
		})
		.from(prescriptions)
		.innerJoin(visits, eq(prescriptions.visitId, visits.id))
		.where(eq(prescriptions.id, prescriptionId))
		.limit(1);

	if (!row) {
		throw new AppServerError("NOT_FOUND", "Prescription not found", 404);
	}

	if (
		options?.expectedPatientId &&
		row.patientId !== options.expectedPatientId
	) {
		throw new AppServerError(
			"FORBIDDEN",
			"Prescription does not belong to the specified patient",
			403
		);
	}

	if (options?.expectedVisitId && row.visitId !== options.expectedVisitId) {
		throw new AppServerError(
			"FORBIDDEN",
			"Prescription does not belong to the specified visit",
			403
		);
	}

	if (isAdminRole(user.role)) {
		return row;
	}

	if (isGuardianOrPatientRole(user.role)) {
		if (user.clinicId && row.clinicId !== user.clinicId) {
			throw new AppServerError(
				"FORBIDDEN",
				"You do not have access to this prescription",
				403
			);
		}
		await assertPatientAccess(user, row.patientId);
		return row;
	}

	assertClinicScope(user, row.clinicId, "Prescription");
	return row;
}

/**
 * Verify access to an immunization record via its parent patient.
 */
export async function assertImmunizationAccess(
	user: SessionUser,
	immunizationId: string,
	options?: { expectedPatientId?: string }
): Promise<ScopedImmunizationRecord> {
	const [row] = await db
		.select({
			id: immunizations.id,
			patientId: immunizations.patientId,
			clinicId: patients.clinicId
		})
		.from(immunizations)
		.innerJoin(patients, eq(immunizations.patientId, patients.id))
		.where(
			and(eq(immunizations.id, immunizationId), isNull(patients.deletedAt))
		)
		.limit(1);

	if (!row) {
		throw new AppServerError("NOT_FOUND", "Immunization not found", 404);
	}

	if (
		options?.expectedPatientId &&
		row.patientId !== options.expectedPatientId
	) {
		throw new AppServerError(
			"FORBIDDEN",
			"Immunization does not belong to the specified patient",
			403
		);
	}

	if (isAdminRole(user.role)) {
		return row;
	}

	if (isGuardianOrPatientRole(user.role)) {
		if (user.clinicId && row.clinicId !== user.clinicId) {
			throw new AppServerError(
				"FORBIDDEN",
				"You do not have access to this immunization",
				403
			);
		}
		await assertPatientAccess(user, row.patientId);
		return row;
	}

	assertClinicScope(user, row.clinicId, "Immunization");
	return row;
}

/**
 * Verify access to a clinic queue entry.
 */
export async function assertQueueEntryAccess(
	user: SessionUser,
	queueId: string
): Promise<ScopedQueueEntryRecord> {
	const [row] = await db
		.select({
			id: clinicQueue.id,
			clinicId: clinicQueue.clinicId,
			patientId: clinicQueue.patientId
		})
		.from(clinicQueue)
		.where(eq(clinicQueue.id, queueId))
		.limit(1);

	if (!row) {
		throw new AppServerError("NOT_FOUND", "Queue entry not found", 404);
	}

	assertClinicScope(user, row.clinicId, "Queue entry");
	return row;
}

/**
 * Verify a target provider/user belongs to the caller's clinic (for non-admin callers).
 */
export async function assertClinicUserAccess(
	user: SessionUser,
	targetUserId: string
): Promise<void> {
	if (isAdminRole(user.role)) {
		return;
	}
	if (!user.clinicId) {
		throw new AppServerError(
			"FORBIDDEN",
			"User is not assigned to a clinic",
			403
		);
	}
	if (targetUserId === user.id) {
		return;
	}
	const [target] = await db
		.select({ id: userTable.id, clinicId: userTable.clinicId })
		.from(userTable)
		.where(eq(userTable.id, targetUserId))
		.limit(1);

	if (!target) {
		throw new AppServerError("NOT_FOUND", "User not found", 404);
	}

	assertClinicScope(user, target.clinicId, "User");
}

export function createScopedGuard(user: SessionUser) {
	return {
		assertClinicScope: (
			targetClinicId: string | null | undefined,
			resource?: string
		) => assertClinicScope(user, targetClinicId, resource),
		resolveClinicId: (requestedClinicId: string | null | undefined) =>
			resolveScopedClinicId(user, requestedClinicId),
		assertPatientAccess: (
			patientId: string,
			options?: { expectedClinicId?: string }
		) => assertPatientAccess(user, patientId, options),
		assertVisitAccess: (
			visitId: string,
			options?: { expectedPatientId?: string; expectedClinicId?: string }
		) => assertVisitAccess(user, visitId, options),
		assertAppointmentAccess: (appointmentId: string) =>
			assertAppointmentAccess(user, appointmentId),
		assertDiagnosisAccess: (
			diagnosisId: string,
			options?: { expectedVisitId?: string }
		) => assertDiagnosisAccess(user, diagnosisId, options),
		assertMeasurementAccess: (
			measurementId: string,
			options?: { expectedPatientId?: string }
		) => assertMeasurementAccess(user, measurementId, options),
		assertPrescriptionAccess: (
			prescriptionId: string,
			options?: { expectedPatientId?: string; expectedVisitId?: string }
		) => assertPrescriptionAccess(user, prescriptionId, options),
		assertImmunizationAccess: (
			immunizationId: string,
			options?: { expectedPatientId?: string }
		) => assertImmunizationAccess(user, immunizationId, options),
		assertQueueEntryAccess: (queueId: string) =>
			assertQueueEntryAccess(user, queueId),
		assertClinicUserAccess: (targetUserId: string) =>
			assertClinicUserAccess(user, targetUserId)
	};
}

function isUserBanned(user: {
	banned?: boolean | null;
	banExpires?: Date | string | null;
}): boolean {
	if (!user.banned) return false;
	if (!user.banExpires) return true;
	const expiresAt =
		user.banExpires instanceof Date
			? user.banExpires
			: new Date(user.banExpires);
	return Number.isNaN(expiresAt.getTime())
		? true
		: expiresAt.getTime() > Date.now();
}

export async function resolveSessionFromHeaders(
	headers: Headers
): Promise<SessionUser | null> {
	const sessionResult = await auth.api.getSession({ headers });
	if (!sessionResult?.session || !sessionResult.user) {
		return null;
	}

	const rawUser = sessionResult.user as {
		id: string;
		email?: string | null;
		name?: string | null;
		role?: unknown;
		clinicId?: unknown;
		banned?: boolean | null;
		banExpires?: Date | string | null;
	};

	if (isUserBanned(rawUser)) {
		throw new AppServerError("FORBIDDEN", "Account is suspended", 403);
	}

	const parsedRole = userRoleSchema.safeParse(rawUser.role);
	const role: UserRole = parsedRole.success
		? parsedRole.data
		: USER_ROLES[USER_ROLES.length - 1];

	const clinicId =
		typeof rawUser.clinicId === "string" && rawUser.clinicId.length > 0
			? rawUser.clinicId
			: null;

	return {
		id: rawUser.id,
		email: rawUser.email ?? "",
		name: rawUser.name ?? "",
		role,
		clinicId
	};
}

export const authMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const headers = getRequestHeaders();
		const user = await resolveSessionFromHeaders(headers);

		if (!user) {
			throw new AppServerError(
				"UNAUTHENTICATED",
				"Authentication required",
				401
			);
		}

		return next({
			context: { user }
		});
	}
);

/**
 * Reusable clinic-scope and resource-ownership middleware.
 * - Eagerly validates `data.clinicId` against `context.user.clinicId` for non-admin callers.
 * - Attaches `context.guard` for fine-grained clinic/patient/resource ownership checks in handlers.
 */
export const clinicScopeMiddleware = createMiddleware({ type: "function" })
	.middleware([authMiddleware])
	.server(async ({ context, data, next }) => {
		const guard = createScopedGuard(context.user);

		if (data && typeof data === "object" && "clinicId" in data) {
			const rawClinicId = (data as { clinicId?: unknown }).clinicId;
			if (typeof rawClinicId === "string" && rawClinicId.length > 0) {
				assertClinicScope(context.user, rawClinicId);
			}
		}

		return next({
			context: {
				...context,
				guard
			}
		});
	});

export function requireRoles(allowedRoles: ReadonlyArray<UserRole>) {
	return createMiddleware({ type: "function" })
		.middleware([authMiddleware, clinicScopeMiddleware])
		.server(async ({ context, next }) => {
			if (!allowedRoles.includes(context.user.role)) {
				throw new AppServerError(
					"FORBIDDEN",
					"You do not have permission to perform this action",
					403
				);
			}
			return next({ context });
		});
}

/** System administrator operations (`admin`). */
export const adminOnlyMiddleware = requireRoles(["admin"]);

/** Clinical & front-desk operations (`admin`, `doctor`, `staff`). */
export const clinicalStaffMiddleware = requireRoles([
	"admin",
	"doctor",
	"staff"
]);

/** Prescribing, clinical diagnoses, and provider-level actions (`admin`, `doctor`). */
export const providerOrAdminMiddleware = requireRoles(["admin", "doctor"]);

/** Clinic financial ledger reads & mutations (`admin`, `staff`). */
export const financeAccessMiddleware = requireRoles(["admin", "staff"]);

/** Diagnosis reads (`admin`, `doctor`, and linked `patient`). */
export const diagnosisReadMiddleware = requireRoles([
	"admin",
	"doctor",
	"patient"
]);

/** Authenticated reads/actions available to staff and linked `guardian`/`patient` accounts. */
export const patientAccessMiddleware = requireRoles([
	"admin",
	"doctor",
	"staff",
	"guardian",
	"patient"
]);
