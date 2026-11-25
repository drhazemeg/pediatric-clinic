// src/server/functions/ai.functions.ts
import type { ClinicGenerationInput } from '@/lib/ai/schemas';
import type { JobKind } from '@/server/queue';

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { and, db, eq, isNull } from '@/db';
import { patients, visits } from '@/db/schema';
import { taskKindSchema } from '@/lib/ai/schemas';
import { enqueueClinicJob } from '@/server/queue';

import { AppServerError, toAppServerError } from '../fn-errors';
import { clinicalStaffMiddleware } from '../fn-middleware';
import { resolveUserAiConfig } from './settings.functions';

const enqueueAiJobSchema = z.object({
  taskKind: taskKindSchema,
  patientId: z.string().min(1),
  visitId: z.string().min(1).optional(),
  freeText: z.string().max(12_000).optional(),
  language: z.enum(['ar', 'en']).default('ar'),
  readingLevel: z.enum(['parents', 'general', 'clinician']).default('parents'),
  dosingQuery: z
    .object({
      drugName: z.string().trim().min(1).max(200),
      proposedDose: z.string().trim().min(1).max(200),
      frequency: z.string().trim().min(1).max(200),
      durationDays: z.number().int().positive().max(365).optional(),
      route: z.string().trim().max(100).optional(),
    })
    .optional(),
});

const jobKindByTask: Record<z.infer<typeof taskKindSchema>, JobKind> = {
  soap_note: 'ai_soap_draft',
  patient_education: 'ai_patient_education',
  differential_dx: 'ai_differential_dx',
  pediatric_dosing_safety: 'ai_dosing_safety',
  growth_interpretation: 'ai_growth_interpretation',
  immunization_advice: 'ai_immunization_advice',
  follow_up_questions: 'ai_follow_up_questions',
};

const calculateAgeMonths = (dateOfBirth: string): number => {
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  const now = new Date();

  return Math.max(
    0,
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
      now.getMonth() -
      birthDate.getMonth() -
      (now.getDate() < birthDate.getDate() ? 1 : 0),
  );
};

export const enqueueAiJobFn = createServerFn({ method: 'POST' })
  .middleware([clinicalStaffMiddleware])
  .validator(enqueueAiJobSchema)
  .handler(async ({ data, context }) => {
    try {
      const patient = await context.guard.assertPatientAccess(data.patientId);

      const patientRows = await db
        .select({
          id: patients.id,
          sex: patients.sex,
          dateOfBirth: patients.dateOfBirth,
          weightKg: patients.weightKg,
          allergies: patients.allergies,
          birthWeightKg: patients.birthWeightKg,
          birthLengthCm: patients.birthLengthCm,
          gestationalAgeWeeks: patients.gestationalAgeWeeks,
        })
        .from(patients)
        .where(and(eq(patients.id, data.patientId), isNull(patients.deletedAt)))
        .limit(1);

      const patientRow = patientRows.at(0);

      if (patientRow === undefined) {
        throw new AppServerError('NOT_FOUND', 'Patient not found', 404);
      }

      let visit: ClinicGenerationInput['visit'];

      if (data.visitId !== undefined && data.visitId !== '') {
        await context.guard.assertVisitAccess(data.visitId, {
          expectedPatientId: data.patientId,
          expectedClinicId: patient.clinicId ?? undefined,
        });

        const visitRows = await db
          .select({
            id: visits.id,
            visitedAt: visits.visitedAt,
            chiefComplaint: visits.chiefComplaint,
            symptoms: visits.symptoms,
            physicalExam: visits.physicalExam,
            plan: visits.plan,
            notes: visits.notes,
          })
          .from(visits)
          .where(eq(visits.id, data.visitId))
          .limit(1);

        const visitRow = visitRows.at(0);

        if (visitRow === undefined) {
          throw new AppServerError('NOT_FOUND', 'Visit not found', 404);
        }

        visit = {
          ...visitRow,
          visitedAt: new Date(visitRow.visitedAt).toISOString(),
        };
      }

      await resolveUserAiConfig(context.user.id);

      const aiInput: Omit<ClinicGenerationInput, 'apiKeyConfig'> = {
        taskKind: data.taskKind,
        language: data.language,
        readingLevel: data.readingLevel,
        patient: {
          id: patientRow.id,
          sex: patientRow.sex,
          dateOfBirth: patientRow.dateOfBirth,
          ageMonths: calculateAgeMonths(patientRow.dateOfBirth),
          weightKg: patientRow.weightKg,
          allergies: patientRow.allergies,
          birthWeightKg: patientRow.birthWeightKg,
          birthLengthCm: patientRow.birthLengthCm,
          gestationalAgeWeeks: patientRow.gestationalAgeWeeks,
        },
      };

      if (visit !== undefined) {
        aiInput.visit = visit;
      }

      if (data.freeText !== undefined && data.freeText !== '') {
        aiInput.freeText = data.freeText;
      }

      if (data.dosingQuery !== undefined) {
        aiInput.dosingQuery = data.dosingQuery;
      }

      const jobId = await enqueueClinicJob(
        jobKindByTask[data.taskKind],
        context.user.id,
        { aiInput },
      );

      return { jobId };
    } catch (error) {
      return toAppServerError(error, 'Failed to enqueue AI request');
    }
  });
