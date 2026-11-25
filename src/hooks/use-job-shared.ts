// apps/web/src/hooks/use-job-shared.ts

/** Shapes mirror the API's JobData + backgroundJob row. */

export const STORAGE_KEY = "clinic_active_jobs";
export const RESULTS_KEY = "clinic_completed_results";
export const CLEARED_JOBS_KEY = "clinic_cleared_jobs";
export const MAX_PARALLEL = 3;

export type JobKind =
	| "growth_recalc"
	| "immunization_sweep"
	| "ledger_report"
	| "certificate_pdf"
	| "ai_soap_draft"
	| "ai_patient_education"
	| "ai_differential_dx"
	| "ai_dosing_safety"
	| "ai_growth_interpretation"
	| "ai_immunization_advice"
	| "ai_follow_up_questions";

export const AI_JOB_KINDS: ReadonlySet<JobKind> = new Set([
	"ai_soap_draft",
	"ai_patient_education",
	"ai_differential_dx",
	"ai_dosing_safety",
	"ai_growth_interpretation",
	"ai_immunization_advice",
	"ai_follow_up_questions"
]);

export interface ActiveJob {
	id: string;
	kind: JobKind;
	status: string;
	progress: number;
	progressMessage: string;
	logs: unknown[];
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
	status: "completed" | "completed_partial" | "failed" | "cancelled";
	/** Shape: { taskKind, data, meta, requiresPhysicianVerification } for AI jobs */
	result: Record<string, unknown> | null;
	errorMessage?: string | null;
	timestamp: number;
}

export interface JobTransportEvent {
	jobId: string;
	status: string;
	data: Record<string, unknown>;
}

export interface JobTransport {
	subscribe(jobIds: string[]): void;
	unsubscribe(): void;
	onUpdate(callback: (event: JobTransportEvent) => void): void;
	onError(callback: (error: Error) => void): void;
	readonly activeJobs: ActiveJob[];
}

export const ACTIVE_STATUSES = new Set([
	"pending",
	"running",
	"processing",
	"running_fast",
	"running_quality"
]);

export const TERMINAL_STATUSES = new Set([
	"completed",
	"completed_partial",
	"failed",
	"cancelled"
]);

export function isTerminal(status: string): boolean {
	return TERMINAL_STATUSES.has(status);
}

export function isAiJob(kind: string): boolean {
	return AI_JOB_KINDS.has(kind as JobKind);
}
