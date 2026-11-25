// apps/web/src/hooks/use-ai.ts
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { aiMutationOptions } from '@/lib/features/ai/query-options';
import { getErrorMessage } from '@/lib/web/error-utils';

export type AiTaskKind =
  | 'soap_note'
  | 'patient_education'
  | 'differential_dx'
  | 'pediatric_dosing_safety'
  | 'growth_interpretation'
  | 'immunization_advice'
  | 'follow_up_questions';

export interface AiPatientContext {
  id: string;
  sex: 'male' | 'female';
  dateOfBirth: string;
  ageMonths: number;
  weightKg?: number;
  gestationalAgeWeeks?: number;
}

export interface AiTriggerParams {
  patientId: string;
  visitId?: string;
  freeText?: string;
  language?: 'ar' | 'en';
  patient?: Partial<AiPatientContext>;
  dosingQuery?: {
    drugName: string;
    proposedDose: string;
    frequency: string;
    durationDays?: number;
    route?: string;
  };
}

export function useAiTrigger(taskKind: AiTaskKind) {
  const executeMutation = useMutation(aiMutationOptions.execute());

  const trigger = async (params: AiTriggerParams): Promise<string | null> => {
    try {
      const payload = {
        taskKind,
        patientId: params.patientId,
        visitId:
          params.visitId !== undefined && params.visitId !== ''
            ? params.visitId
            : undefined,
        freeText: params.freeText,
        dosingQuery: params.dosingQuery,
        readingLevel: 'parents' as const,
        language: params.language ?? 'ar',
      };

      const res = await executeMutation.mutateAsync(payload);

      return res.jobId;
    } catch (error: unknown) {
      toast.error('AI request failed', {
        description: getErrorMessage(error),
      });

      return null;
    }
  };

  return {
    trigger,
    isPending: executeMutation.isPending,
    error: executeMutation.error,
  };
}
