import type { SessionUser } from '../fn-middleware';

import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { AppServerError } from '../fn-errors';

interface MockDbRow {
  id?: string;
  clinicId?: string | null;
  userId?: string;
  patientId?: string;
  visitId?: string;
  prescribedById?: string | null;
  doctorId?: string | null;
  status?: string;
}

interface MockColumnOrExpr {
  op?: string;
}

// Queue of mocked SELECT results for Drizzle's `db.select(...).from(...).where(...).limit(1)`
// and `db.select(...).from(...).innerJoin(...).where(...).limit(1)` chains.
const queuedRows: Array<Array<MockDbRow>> = [];

const nextResult = (): Array<MockDbRow> => queuedRows.shift() ?? [];

const makeQueryChain = () => {
  const chain = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    limit: async () => await Promise.resolve(nextResult()),
  };

  return chain;
};

void mock.module('@/db', () => ({
  and: (...args: Array<MockColumnOrExpr>) => ({ op: 'and', args }),
  eq: (col: MockColumnOrExpr, val: string) => ({ op: 'eq', col, val }),
  isNull: (col: MockColumnOrExpr) => ({ op: 'isNull', col }),
  db: {
    select: () => makeQueryChain(),
  },
}));

void mock.module('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: async () => await Promise.resolve(null),
    },
  },
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
  resolveScopedClinicId,
} = await import('../fn-middleware');

const adminUser: SessionUser = {
  id: 'user-admin',
  email: 'admin@clinic.test',
  name: 'Admin',
  role: 'admin',
  clinicId: null,
};

const doctorClinicA: SessionUser = {
  id: 'user-doc-a',
  email: 'doc@clinic-a.test',
  name: 'Dr. A',
  role: 'doctor',
  clinicId: 'clinic-a',
};

const staffClinicA: SessionUser = {
  id: 'user-staff-a',
  email: 'staff@clinic-a.test',
  name: 'Staff A',
  role: 'staff',
  clinicId: 'clinic-a',
};

const doctorNoClinic: SessionUser = {
  id: 'user-doc-none',
  email: 'doc-none@clinic.test',
  name: 'Dr. None',
  role: 'doctor',
  clinicId: null,
};

const guardianUser: SessionUser = {
  id: 'user-guardian-1',
  email: 'parent@example.test',
  name: 'Parent',
  role: 'guardian',
  clinicId: null,
};

const patientUserScoped: SessionUser = {
  id: 'user-patient-1',
  email: 'patient@example.test',
  name: 'Patient',
  role: 'patient',
  clinicId: 'clinic-a',
};

type TestThunkResult = string | object | null | undefined;

const assertIsAppError = (
  error: AppServerError | null,
  expectedCode: AppServerError['code'],
  expectedStatus: number,
) => {
  expect(error).toBeInstanceOf(AppServerError);

  if (error !== null) {
    expect(error.code).toBe(expectedCode);
    expect(error.status).toBe(expectedStatus);
  }
};

const expectSyncAppError = (
  fn: (() => TestThunkResult) | (() => void),
  expectedCode: AppServerError['code'],
  expectedStatus: number,
) => {
  try {
    fn();
    expect.unreachable(`Expected AppServerError(${expectedCode})`);
  } catch (error) {
    assertIsAppError(
      error instanceof AppServerError ? error : null,
      expectedCode,
      expectedStatus,
    );
  }
};

const expectAppError = async (
  fn: (() => Promise<TestThunkResult>) | (() => Promise<void>),
  expectedCode: AppServerError['code'],
  expectedStatus: number,
) => {
  try {
    await fn();
    expect.unreachable(`Expected AppServerError(${expectedCode})`);
  } catch (error) {
    assertIsAppError(
      error instanceof AppServerError ? error : null,
      expectedCode,
      expectedStatus,
    );
  }
};

beforeEach(() => {
  queuedRows.length = 0;
});

describe('assertClinicScope', () => {
  it('allows admin for any clinicId including null', () => {
    expect(() => assertClinicScope(adminUser, 'clinic-b')).not.toThrow();
    expect(() => assertClinicScope(adminUser, null)).not.toThrow();
  });

  it('allows doctor and staff within their own clinicId', () => {
    expect(() => assertClinicScope(doctorClinicA, 'clinic-a')).not.toThrow();
    expect(() => assertClinicScope(staffClinicA, 'clinic-a')).not.toThrow();
  });

  it('rejects non-admin users without a clinicId', () => {
    expectSyncAppError(
      () => assertClinicScope(doctorNoClinic, 'clinic-a'),
      'FORBIDDEN',
      403,
    );
  });

  it('rejects non-admin users accessing another clinicId or null', () => {
    expectSyncAppError(
      () => assertClinicScope(doctorClinicA, 'clinic-b'),
      'FORBIDDEN',
      403,
    );
    expectSyncAppError(
      () => assertClinicScope(staffClinicA, null),
      'FORBIDDEN',
      403,
    );
  });
});

describe('resolveScopedClinicId', () => {
  it('defaults non-admin clinicId to user.clinicId when omitted', () => {
    expect(resolveScopedClinicId(doctorClinicA, undefined)).toBe('clinic-a');
    expect(resolveScopedClinicId(staffClinicA, null)).toBe('clinic-a');
  });

  it('rejects mismatched clinicId for non-admin', () => {
    expectSyncAppError(
      () => resolveScopedClinicId(doctorClinicA, 'clinic-b'),
      'FORBIDDEN',
      403,
    );
  });

  it('preserves explicit clinicId for admin', () => {
    expect(resolveScopedClinicId(adminUser, 'clinic-b')).toBe('clinic-b');
    expect(resolveScopedClinicId(adminUser, null)).toBeNull();
  });
});

describe('resource ownership guards', () => {
  it('allows doctor in same clinic and blocks cross-clinic patient access', async () => {
    queuedRows.push([{ id: 'pat-1', clinicId: 'clinic-a' }]);
    const ok = await assertPatientAccess(doctorClinicA, 'pat-1');
    expect(ok).toEqual({ id: 'pat-1', clinicId: 'clinic-a' });

    queuedRows.push([{ id: 'pat-2', clinicId: 'clinic-b' }]);
    await expectAppError(
      async () => await assertPatientAccess(doctorClinicA, 'pat-2'),
      'FORBIDDEN',
      403,
    );
  });

  it('throws NOT_FOUND when patient does not exist', async () => {
    queuedRows.push([]);
    await expectAppError(
      async () => await assertPatientAccess(doctorClinicA, 'missing-pat'),
      'NOT_FOUND',
      404,
    );
  });

  it('allows guardian only for linked patients', async () => {
    // Linked patient
    queuedRows.push(
      [{ id: 'pat-1', clinicId: 'clinic-a' }],
      [{ userId: guardianUser.id }],
    );
    const ok = await assertPatientAccess(guardianUser, 'pat-1');
    expect(ok.id).toBe('pat-1');

    // Unlinked patient
    queuedRows.push([{ id: 'pat-2', clinicId: 'clinic-a' }], []);
    await expectAppError(
      async () => await assertPatientAccess(guardianUser, 'pat-2'),
      'FORBIDDEN',
      403,
    );
  });

  it('rejects patient role when patient clinic differs from user.clinicId', async () => {
    queuedRows.push([{ id: 'pat-2', clinicId: 'clinic-b' }]);
    await expectAppError(
      async () => await assertPatientAccess(patientUserScoped, 'pat-2'),
      'FORBIDDEN',
      403,
    );
  });

  it('verifies visit clinic scope and expectedPatientId consistency', async () => {
    queuedRows.push([
      { id: 'vis-1', patientId: 'pat-1', clinicId: 'clinic-a' },
    ]);

    const visit = await assertVisitAccess(staffClinicA, 'vis-1', {
      expectedPatientId: 'pat-1',
    });

    expect(visit.id).toBe('vis-1');

    queuedRows.push([
      { id: 'vis-1', patientId: 'pat-1', clinicId: 'clinic-a' },
    ]);
    await expectAppError(
      async () =>
        await assertVisitAccess(staffClinicA, 'vis-1', {
          expectedPatientId: 'pat-other',
        }),
      'FORBIDDEN',
      403,
    );

    queuedRows.push([
      { id: 'vis-2', patientId: 'pat-2', clinicId: 'clinic-b' },
    ]);
    await expectAppError(
      async () => await assertVisitAccess(staffClinicA, 'vis-2'),
      'FORBIDDEN',
      403,
    );
  });

  it('verifies appointment access for staff and linked guardian', async () => {
    queuedRows.push(
      [
        {
          id: 'appt-1',
          patientId: 'pat-1',
          clinicId: 'clinic-a',
          doctorId: 'user-doc-a',
          status: 'scheduled',
        },
      ],
      [{ id: 'pat-1', clinicId: 'clinic-a' }],
      [{ userId: guardianUser.id }],
    );
    const appt = await assertAppointmentAccess(guardianUser, 'appt-1');
    expect(appt.id).toBe('appt-1');

    queuedRows.push([
      {
        id: 'appt-2',
        patientId: 'pat-2',
        clinicId: 'clinic-b',
        doctorId: null,
        status: 'scheduled',
      },
    ]);
    await expectAppError(
      async () => await assertAppointmentAccess(doctorClinicA, 'appt-2'),
      'FORBIDDEN',
      403,
    );
  });

  it('verifies diagnosis, measurement, prescription, immunization, queue, and clinic user guards', async () => {
    queuedRows.push([
      {
        id: 'diag-1',
        visitId: 'vis-1',
        patientId: 'pat-1',
        clinicId: 'clinic-b',
      },
    ]);
    await expectAppError(
      async () => await assertDiagnosisAccess(doctorClinicA, 'diag-1'),
      'FORBIDDEN',
      403,
    );

    queuedRows.push([
      {
        id: 'meas-1',
        visitId: 'vis-1',
        patientId: 'pat-1',
        clinicId: 'clinic-a',
      },
    ]);
    await expectAppError(
      async () =>
        await assertMeasurementAccess(doctorClinicA, 'meas-1', {
          expectedPatientId: 'pat-other',
        }),
      'FORBIDDEN',
      403,
    );

    queuedRows.push([
      {
        id: 'rx-1',
        visitId: 'vis-1',
        patientId: 'pat-1',
        prescribedById: 'user-doc-a',
        clinicId: 'clinic-b',
      },
    ]);
    await expectAppError(
      async () => await assertPrescriptionAccess(doctorClinicA, 'rx-1'),
      'FORBIDDEN',
      403,
    );

    queuedRows.push([
      { id: 'imm-1', patientId: 'pat-1', clinicId: 'clinic-b' },
    ]);
    await expectAppError(
      async () => await assertImmunizationAccess(staffClinicA, 'imm-1'),
      'FORBIDDEN',
      403,
    );

    queuedRows.push([{ id: 'q-1', clinicId: 'clinic-b', patientId: 'pat-1' }]);
    await expectAppError(
      async () => await assertQueueEntryAccess(staffClinicA, 'q-1'),
      'FORBIDDEN',
      403,
    );

    queuedRows.push([{ id: 'doc-b', clinicId: 'clinic-b' }]);
    await expectAppError(
      async () => await assertClinicUserAccess(doctorClinicA, 'doc-b'),
      'FORBIDDEN',
      403,
    );

    // Same-user clinic lookup short-circuits cleanly
    const sameUserResult = await assertClinicUserAccess(
      doctorClinicA,
      doctorClinicA.id,
    );

    expect(sameUserResult).toBeUndefined();

    const guard = createScopedGuard(adminUser);
    expect(() => guard.assertClinicScope('clinic-z')).not.toThrow();
  });
});
