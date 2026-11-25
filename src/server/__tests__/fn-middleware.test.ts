import { beforeEach, describe, expect, it, mock } from "bun:test";
import { AppServerError } from "../fn-errors";
import type { SessionUser } from "../fn-middleware";

// Queue of mocked SELECT results for Drizzle's `db.select(...).from(...).where(...).limit(1)`
// and `db.select(...).from(...).innerJoin(...).where(...).limit(1)` chains.
const queuedRows: Array<Array<Record<string, unknown>>> = [];

function nextResult(): Array<Record<string, unknown>> {
	return queuedRows.shift() ?? [];
}

function makeQueryChain() {
	const chain = {
		from: () => chain,
		innerJoin: () => chain,
		where: () => chain,
		limit: async () => nextResult()
	};
	return chain;
}

mock.module("@/db", () => ({
	and: (...args: unknown[]) => ({ op: "and", args }),
	eq: (col: unknown, val: unknown) => ({ op: "eq", col, val }),
	isNull: (col: unknown) => ({ op: "isNull", col }),
	db: {
		select: () => makeQueryChain()
	}
}));

mock.module("@/lib/auth", () => ({
	auth: {
		api: {
			getSession: async () => null
		}
	}
}));

const {
	assertAppointmentAccess,
	assertClinicScope,
	assertClinicUserAccess,
	assertDiagnosisAccess,
	assertImmunizationAccess,
	assertMeasurementAccess,
	assertPatientAccess,
	assertPrescriptionAccess,
	assertQueueEntryAccess,
	assertVisitAccess,
	createScopedGuard,
	resolveScopedClinicId
} = await import("../fn-middleware");

const adminUser: SessionUser = {
	id: "user-admin",
	email: "admin@clinic.test",
	name: "Admin",
	role: "admin",
	clinicId: null
};

const doctorClinicA: SessionUser = {
	id: "user-doc-a",
	email: "doc@clinic-a.test",
	name: "Dr. A",
	role: "doctor",
	clinicId: "clinic-a"
};

const staffClinicA: SessionUser = {
	id: "user-staff-a",
	email: "staff@clinic-a.test",
	name: "Staff A",
	role: "staff",
	clinicId: "clinic-a"
};

const doctorNoClinic: SessionUser = {
	id: "user-doc-none",
	email: "doc-none@clinic.test",
	name: "Dr. None",
	role: "doctor",
	clinicId: null
};

const guardianUser: SessionUser = {
	id: "user-guardian-1",
	email: "parent@example.test",
	name: "Parent",
	role: "guardian",
	clinicId: null
};

const patientUserScoped: SessionUser = {
	id: "user-patient-1",
	email: "patient@example.test",
	name: "Patient",
	role: "patient",
	clinicId: "clinic-a"
};

async function expectAppError(
	fn: () => Promise<unknown> | unknown,
	expectedCode: AppServerError["code"],
	expectedStatus: number
) {
	try {
		await fn();
		expect.unreachable(`Expected AppServerError(${expectedCode})`);
	} catch (err) {
		expect(err).toBeInstanceOf(AppServerError);
		expect((err as AppServerError).code).toBe(expectedCode);
		expect((err as AppServerError).status).toBe(expectedStatus);
	}
}

beforeEach(() => {
	queuedRows.length = 0;
});

describe("assertClinicScope", () => {
	it("allows admin for any clinicId including null", () => {
		expect(() => assertClinicScope(adminUser, "clinic-b")).not.toThrow();
		expect(() => assertClinicScope(adminUser, null)).not.toThrow();
	});

	it("allows doctor and staff within their own clinicId", () => {
		expect(() => assertClinicScope(doctorClinicA, "clinic-a")).not.toThrow();
		expect(() => assertClinicScope(staffClinicA, "clinic-a")).not.toThrow();
	});

	it("rejects non-admin users without a clinicId", async () => {
		await expectAppError(
			() => assertClinicScope(doctorNoClinic, "clinic-a"),
			"FORBIDDEN",
			403
		);
	});

	it("rejects non-admin users accessing another clinicId or null", async () => {
		await expectAppError(
			() => assertClinicScope(doctorClinicA, "clinic-b"),
			"FORBIDDEN",
			403
		);
		await expectAppError(
			() => assertClinicScope(staffClinicA, null),
			"FORBIDDEN",
			403
		);
	});
});

describe("resolveScopedClinicId", () => {
	it("defaults non-admin clinicId to user.clinicId when omitted", () => {
		expect(resolveScopedClinicId(doctorClinicA, undefined)).toBe("clinic-a");
		expect(resolveScopedClinicId(staffClinicA, null)).toBe("clinic-a");
	});

	it("rejects mismatched clinicId for non-admin", async () => {
		await expectAppError(
			() => resolveScopedClinicId(doctorClinicA, "clinic-b"),
			"FORBIDDEN",
			403
		);
	});

	it("preserves explicit clinicId for admin", () => {
		expect(resolveScopedClinicId(adminUser, "clinic-b")).toBe("clinic-b");
		expect(resolveScopedClinicId(adminUser, null)).toBeNull();
	});
});

describe("resource ownership guards", () => {
	it("allows doctor in same clinic and blocks cross-clinic patient access", async () => {
		queuedRows.push([{ id: "pat-1", clinicId: "clinic-a" }]);
		const ok = await assertPatientAccess(doctorClinicA, "pat-1");
		expect(ok).toEqual({ id: "pat-1", clinicId: "clinic-a" });

		queuedRows.push([{ id: "pat-2", clinicId: "clinic-b" }]);
		await expectAppError(
			() => assertPatientAccess(doctorClinicA, "pat-2"),
			"FORBIDDEN",
			403
		);
	});

	it("throws NOT_FOUND when patient does not exist", async () => {
		queuedRows.push([]);
		await expectAppError(
			() => assertPatientAccess(doctorClinicA, "missing-pat"),
			"NOT_FOUND",
			404
		);
	});

	it("allows guardian only for linked patients", async () => {
		// Linked patient
		queuedRows.push([{ id: "pat-1", clinicId: "clinic-a" }]);
		queuedRows.push([{ userId: guardianUser.id }]);
		const ok = await assertPatientAccess(guardianUser, "pat-1");
		expect(ok.id).toBe("pat-1");

		// Unlinked patient
		queuedRows.push([{ id: "pat-2", clinicId: "clinic-a" }]);
		queuedRows.push([]);
		await expectAppError(
			() => assertPatientAccess(guardianUser, "pat-2"),
			"FORBIDDEN",
			403
		);
	});

	it("rejects patient role when patient clinic differs from user.clinicId", async () => {
		queuedRows.push([{ id: "pat-2", clinicId: "clinic-b" }]);
		await expectAppError(
			() => assertPatientAccess(patientUserScoped, "pat-2"),
			"FORBIDDEN",
			403
		);
	});

	it("verifies visit clinic scope and expectedPatientId consistency", async () => {
		queuedRows.push([
			{ id: "vis-1", patientId: "pat-1", clinicId: "clinic-a" }
		]);
		const visit = await assertVisitAccess(staffClinicA, "vis-1", {
			expectedPatientId: "pat-1"
		});
		expect(visit.id).toBe("vis-1");

		queuedRows.push([
			{ id: "vis-1", patientId: "pat-1", clinicId: "clinic-a" }
		]);
		await expectAppError(
			() =>
				assertVisitAccess(staffClinicA, "vis-1", {
					expectedPatientId: "pat-other"
				}),
			"FORBIDDEN",
			403
		);

		queuedRows.push([
			{ id: "vis-2", patientId: "pat-2", clinicId: "clinic-b" }
		]);
		await expectAppError(
			() => assertVisitAccess(staffClinicA, "vis-2"),
			"FORBIDDEN",
			403
		);
	});

	it("verifies appointment access for staff and linked guardian", async () => {
		queuedRows.push([
			{
				id: "appt-1",
				patientId: "pat-1",
				clinicId: "clinic-a",
				doctorId: "user-doc-a",
				status: "scheduled"
			}
		]);
		queuedRows.push([{ id: "pat-1", clinicId: "clinic-a" }]);
		queuedRows.push([{ userId: guardianUser.id }]);
		const appt = await assertAppointmentAccess(guardianUser, "appt-1");
		expect(appt.id).toBe("appt-1");

		queuedRows.push([
			{
				id: "appt-2",
				patientId: "pat-2",
				clinicId: "clinic-b",
				doctorId: null,
				status: "scheduled"
			}
		]);
		await expectAppError(
			() => assertAppointmentAccess(doctorClinicA, "appt-2"),
			"FORBIDDEN",
			403
		);
	});

	it("verifies diagnosis, measurement, prescription, immunization, queue, and clinic user guards", async () => {
		queuedRows.push([
			{
				id: "diag-1",
				visitId: "vis-1",
				patientId: "pat-1",
				clinicId: "clinic-b"
			}
		]);
		await expectAppError(
			() => assertDiagnosisAccess(doctorClinicA, "diag-1"),
			"FORBIDDEN",
			403
		);

		queuedRows.push([
			{
				id: "meas-1",
				visitId: "vis-1",
				patientId: "pat-1",
				clinicId: "clinic-a"
			}
		]);
		await expectAppError(
			() =>
				assertMeasurementAccess(doctorClinicA, "meas-1", {
					expectedPatientId: "pat-other"
				}),
			"FORBIDDEN",
			403
		);

		queuedRows.push([
			{
				id: "rx-1",
				visitId: "vis-1",
				patientId: "pat-1",
				prescribedById: "user-doc-a",
				clinicId: "clinic-b"
			}
		]);
		await expectAppError(
			() => assertPrescriptionAccess(doctorClinicA, "rx-1"),
			"FORBIDDEN",
			403
		);

		queuedRows.push([
			{ id: "imm-1", patientId: "pat-1", clinicId: "clinic-b" }
		]);
		await expectAppError(
			() => assertImmunizationAccess(staffClinicA, "imm-1"),
			"FORBIDDEN",
			403
		);

		queuedRows.push([{ id: "q-1", clinicId: "clinic-b", patientId: "pat-1" }]);
		await expectAppError(
			() => assertQueueEntryAccess(staffClinicA, "q-1"),
			"FORBIDDEN",
			403
		);

		queuedRows.push([{ id: "doc-b", clinicId: "clinic-b" }]);
		await expectAppError(
			() => assertClinicUserAccess(doctorClinicA, "doc-b"),
			"FORBIDDEN",
			403
		);

		// Same-user clinic lookup short-circuits cleanly
		await expect(
			assertClinicUserAccess(doctorClinicA, doctorClinicA.id)
		).resolves.toBeUndefined();

		const guard = createScopedGuard(adminUser);
		expect(() => guard.assertClinicScope("clinic-z")).not.toThrow();
	});
});
