// apps/web/src/hooks/use-job-shared.ts

import { z } from 'zod';

/** Shapes mirror the API's JobData + backgroundJob row. */

export type JobJsonPrimitive = string | number | boolean | null;

export type JobJsonValue =
  | JobJsonPrimitive
  | Array<JobJsonValue>
  | { [key: string]: JobJsonValue };

export type JobJsonRecord = Record<string, JobJsonValue>;

export const jobJsonValueSchema: z.ZodType<JobJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jobJsonValueSchema),
    z.record(z.string(), jobJsonValueSchema),
  ]),
);

export const jobJsonRecordSchema = z.record(z.string(), jobJsonValueSchema);

export const STORAGE_KEY = 'clinic_active_jobs';
export const RESULTS_KEY = 'clinic_completed_results';
export const CLEARED_JOBS_KEY = 'clinic_cleared_jobs';
export const MAX_PARALLEL = 3;

export type JobKind =
  | 'growth_recalc'
  | 'immunization_sweep'
  | 'ledger_report'
  | 'certificate_pdf'
  | 'ai_soap_draft'
  | 'ai_patient_education'
  | 'ai_differential_dx'
  | 'ai_dosing_safety'
  | 'ai_growth_interpretation'
  | 'ai_immunization_advice'
  | 'ai_follow_up_questions';

export const AI_JOB_KINDS: ReadonlySet<JobKind> = new Set([
  'ai_soap_draft',
  'ai_patient_education',
  'ai_differential_dx',
  'ai_dosing_safety',
  'ai_growth_interpretation',
  'ai_immunization_advice',
  'ai_follow_up_questions',
]);

export interface ActiveJob {
  id: string;
  kind: JobKind;
  status: string;
  progress: number;
  progressMessage: string;
  logs: Array<unknown>;
  resultJson: unknown;
  errorMessage?: string;
  tokensUsed?: number;
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompletedResult {
  jobId: string;
  kind: JobKind;
  status: 'completed' | 'completed_partial' | 'failed' | 'cancelled';
  /** Shape: { taskKind, data, meta, requiresPhysicianVerification } for AI jobs */
  result: JobJsonRecord | null;
  errorMessage: string | null;
  timestamp: number;
}

export interface JobUpdatePayload {
  kind?: JobKind;
  resultJson?: JobJsonRecord | null;
  errorMessage?: string | null;
}

export interface JobTransportEvent {
  jobId: string;
  status: string;
  data: JobUpdatePayload;
}

export interface JobTransport {
  subscribe: (jobIds: Array<string>) => void;
  unsubscribe: () => void;
  onUpdate: (listener: (event: JobTransportEvent) => void) => void;
  onError: (listener: (error: Error) => void) => void;
  readonly activeJobs: Array<ActiveJob>;
}

export const ACTIVE_STATUSES = new Set([
  'pending',
  'running',
  'processing',
  'running_fast',
  'running_quality',
]);

export const TERMINAL_STATUSES = new Set([
  'completed',
  'completed_partial',
  'failed',
  'cancelled',
]);

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

const AI_JOB_KIND_STRINGS: ReadonlySet<string> = new Set(AI_JOB_KINDS);

export function isAiJob(kind: string): boolean {
  return AI_JOB_KIND_STRINGS.has(kind);
}
