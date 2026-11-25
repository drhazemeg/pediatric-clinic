import type { ScopedGuard, SessionUser } from '@/server/fn-middleware';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { handleMcpRequest } from '#/utils/mcp-handler';
import { listTodayAppointmentsForClinic } from '@/db/queries/appointments.queries';
import { getPatientImmunizations } from '@/db/queries/immunization.queries';
import {
  getPatientByMrn,
  getPatientSummary,
  searchPatientsForMcp,
} from '@/db/queries/patients.queries';
import { getTodayQueue } from '@/db/queries/queue.queries';
import { AppServerError } from '@/server/fn-errors';
import {
  createScopedGuard,
  resolveSessionFromHeaders,
} from '@/server/fn-middleware';

interface McpContext {
  user: SessionUser;
  guard: ScopedGuard;
}

const formatMcpText = (text: string) => ({
  content: [{ type: 'text' as const, text }],
});

const resolveClinicId = (
  context: McpContext,
  requestedClinicId?: string,
): string => {
  const clinicId = requestedClinicId ?? context.user.clinicId ?? '';

  if (clinicId.length === 0) {
    throw new AppServerError(
      'BAD_REQUEST',
      'clinicId is required for administrator requests',
      400,
    );
  }

  context.guard.assertClinicScope(clinicId);

  return clinicId;
};

const DATE_PATTERN = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u;

const parseLocalDate = (value: string | undefined): Date => {
  if (value === undefined || value.length === 0) {
    return new Date();
  }

  const match = DATE_PATTERN.exec(value);
  const year = match?.groups?.year;
  const month = match?.groups?.month;
  const day = match?.groups?.day;

  if (year === undefined || month === undefined || day === undefined) {
    throw new AppServerError('BAD_REQUEST', 'date must use YYYY-MM-DD', 400);
  }

  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    throw new AppServerError('BAD_REQUEST', 'date is invalid', 400);
  }

  return date;
};

const createClinicMcpServer = (context: McpContext) => {
  const server = new McpServer({
    name: 'pediatric-clinic',
    version: '1.0.0',
  });

  server.registerTool(
    'search_patients',
    {
      title: 'Search patients',
      description:
        "Search active patients in the authenticated user's clinic by name or medical record number. Returns only basic identifying details.",
      inputSchema: {
        query: z.string().trim().min(1).max(120),
        clinicId: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(20).default(10),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, clinicId, limit }) => {
      const rows = await searchPatientsForMcp(
        resolveClinicId(context, clinicId),
        query,
        limit,
      );

      return formatMcpText(JSON.stringify(rows));
    },
  );

  server.registerTool(
    'get_patient_summary',
    {
      title: 'Get patient summary',
      description:
        'Return a minimal demographic summary for a patient the authenticated clinical user is allowed to access.',
      inputSchema: { patientId: z.string().min(1) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ patientId }) => {
      await context.guard.assertPatientAccess(patientId);
      const patient = await getPatientSummary(patientId);

      if (!patient) {
        throw new AppServerError('NOT_FOUND', 'Patient not found', 404);
      }

      return formatMcpText(JSON.stringify(patient));
    },
  );

  server.registerTool(
    'get_patient_immunization_schedule',
    {
      title: 'Get patient immunization schedule',
      description:
        'Return vaccine dose status and due dates for a patient the authenticated clinical user is allowed to access.',
      inputSchema: { patientId: z.string().min(1) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ patientId }) => {
      await context.guard.assertPatientAccess(patientId);
      const records = await getPatientImmunizations(patientId);

      return formatMcpText(
        JSON.stringify(
          records.map((record) => ({
            vaccine: record.vaccineName,
            doseNumber: record.doseNumber,
            status: record.status,
            administeredDate: record.administeredDate,
            dueDate: record.dueDate,
            nextDueDate: record.nextDueDate,
          })),
        ),
      );
    },
  );

  server.registerTool(
    'list_today_appointments',
    {
      title: "List today's appointments",
      description:
        "List a bounded number of today's appointments for the authenticated user's clinic.",
      inputSchema: {
        clinicId: z.string().min(1).optional(),
        date: z.string().optional().describe('Local clinic date in YYYY-MM-DD'),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ clinicId, date, limit }) => {
      const rows = await listTodayAppointmentsForClinic(
        resolveClinicId(context, clinicId),
        parseLocalDate(date),
        limit,
      );

      return formatMcpText(
        JSON.stringify(
          rows.map((row) => ({
            id: row.id,
            scheduledAt: row.scheduledAt,
            status: row.status,
            reason: row.reason,
            patient: {
              mrn: row.patient.mrn,
              firstName: row.patient.firstName,
              lastName: row.patient.lastName,
            },
            doctor: row.doctor
              ? { id: row.doctor.id, name: row.doctor.name }
              : null,
          })),
        ),
      );
    },
  );

  server.registerTool(
    'list_today_queue',
    {
      title: "List today's clinic queue",
      description:
        "List a bounded number of today's queue entries for the authenticated user's clinic.",
      inputSchema: {
        clinicId: z.string().min(1).optional(),
        date: z.string().optional().describe('Local clinic date in YYYY-MM-DD'),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ clinicId, date, limit }) => {
      const rows = await getTodayQueue(
        resolveClinicId(context, clinicId),
        parseLocalDate(date),
        limit,
      );

      return formatMcpText(
        JSON.stringify(
          rows.map((row) => ({
            queueNumber: row.queueNumber,
            status: row.status,
            priority: row.priority,
            isWalkIn: row.isWalkIn,
            patient: {
              mrn: row.patient.mrn,
              firstName: row.patient.firstName,
              lastName: row.patient.lastName,
            },
            doctor: row.doctor ? { name: row.doctor.name } : null,
            appointment: row.appointment
              ? { scheduledAt: row.appointment.scheduledAt }
              : null,
          })),
        ),
      );
    },
  );

  server.registerTool(
    'get_patient_by_mrn',
    {
      title: 'Get patient by medical record number',
      description:
        "Look up a patient by MRN within the authenticated user's clinic and return basic demographics.",
      inputSchema: {
        mrn: z.string().trim().min(1).max(80),
        clinicId: z.string().min(1).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ mrn, clinicId }) => {
      const patient = await getPatientByMrn(
        resolveClinicId(context, clinicId),
        mrn,
      );

      if (!patient) {
        throw new AppServerError('NOT_FOUND', 'Patient not found', 404);
      }

      return formatMcpText(
        JSON.stringify({
          id: patient.id,
          mrn: patient.mrn,
          firstName: patient.firstName,
          lastName: patient.lastName,
          sex: patient.sex,
          dateOfBirth: patient.dateOfBirth,
        }),
      );
    },
  );

  return server;
};

export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await resolveSessionFromHeaders(request.headers);

        if (!user) {
          return Response.json(
            { error: 'Authentication required' },
            { status: 401, headers: { 'Cache-Control': 'no-store' } },
          );
        }

        if (!['admin', 'doctor', 'staff'].includes(user.role)) {
          return Response.json(
            { error: 'Clinical staff access required' },
            { status: 403, headers: { 'Cache-Control': 'no-store' } },
          );
        }

        const server = createClinicMcpServer({
          user,
          guard: createScopedGuard(user),
        });

        return await handleMcpRequest(request, server);
      },
    },
  },
});
