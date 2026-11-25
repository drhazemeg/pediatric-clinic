// apps/web/src/lib/web/jobs-store.ts
// Smart Clinic — Pediatric & Neonatal Clinic Management System
// Background-job state management (TanStack Store) for the jobs UI,
// AI Assistant panel, and per-patient job widgets.
//
// NOTE: this store holds *client* state only (which job IDs are being
// tracked, terminal results, errors, removed IDs). Server truth lives in
// `backgroundJob` and is fetched via `listJobsFn` / `getClinicJobFn`.

import { batch, createStore, useSelector } from "@tanstack/react-store";
import type { JobKind } from "#/hooks/use-job-shared.ts";

// =============================================================================
// Types
// =============================================================================

export type JobStatus =
	| "queued"
	| "running"
	| "completed"
	| "completed_partial"
	| "failed"
	| "cancelled";

export interface JobResult {
	jobId: string;
	kind: JobKind;
	status: JobStatus;
	result: Record<string, unknown> | null;
	errorMessage: string | null;
	timestamp: number;
}

export interface JobsState {
	/** Jobs the user is actively tracking (started here or discovered). */
	jobIds: string[];

	/** Terminal results, keyed by jobId. */
	completedResults: Record<string, JobResult>;

	/** Last status seen per job (used to dedupe polling updates). */
	processedStates: Record<string, string>;

	/** Jobs the user dismissed — never re-add them from discovery. */
	removedIds: string[];

	/** Last surfaced error. */
	error: string | null;
}

// =============================================================================
// Initial state
// =============================================================================

function createInitialState(): JobsState {
	return {
		jobIds: [],
		completedResults: {},
		processedStates: {},
		removedIds: [],
		error: null
	};
}

// =============================================================================
// Store
// =============================================================================

export const jobsStore = createStore<JobsState>(createInitialState());

/** Reactive selector hook. Components subscribe to only what they select. */
export function useJobsStore<T = JobsState>(
	selector: (state: JobsState) => T = state => state as unknown as T
): T {
	return useSelector(jobsStore, selector);
}

// =============================================================================
// Derived stores
// =============================================================================

export const jobIdsStore = createStore(() => jobsStore.state.jobIds);

export const activeJobCountStore = createStore(
	() => jobsStore.state.jobIds.length
);

export const jobErrorStore = createStore(() => jobsStore.state.error);

export const completedResultsStore = createStore(
	() => jobsStore.state.completedResults
);

export const jobCountsStore = createStore(() => {
	const results = Object.values(jobsStore.state.completedResults);
	return {
		total: jobsStore.state.jobIds.length,
		completed: results.filter(r => r.status === "completed").length,
		partial: results.filter(r => r.status === "completed_partial").length,
		failed: results.filter(r => r.status === "failed").length,
		cancelled: results.filter(r => r.status === "cancelled").length
	};
});

// =============================================================================
// Actions
// =============================================================================

export const jobActions = {
	// -------------------------------------------------------------------------
	// Tracking
	// -------------------------------------------------------------------------

	addJob(id: string) {
		jobsStore.setState(s =>
			s.jobIds.includes(id)
				? s
				: {
						...s,
						jobIds: [...s.jobIds, id],
						removedIds: s.removedIds.filter(r => r !== id)
					}
		);
	},

	removeJob(id: string) {
		jobsStore.setState(s => ({
			...s,
			jobIds: s.jobIds.filter(j => j !== id),
			removedIds: s.removedIds.includes(id)
				? s.removedIds
				: [...s.removedIds, id]
		}));
	},

	resetAll() {
		jobsStore.setState(() => createInitialState());
	},

	// -------------------------------------------------------------------------
	// Status / results
	// -------------------------------------------------------------------------

	trackStatus(id: string, status: string) {
		jobsStore.setState(s => ({
			...s,
			processedStates: { ...s.processedStates, [id]: status }
		}));
	},

	setResult(result: JobResult) {
		jobsStore.setState(s => ({
			...s,
			completedResults: { ...s.completedResults, [result.jobId]: result }
		}));
	},

	clearResult(id: string) {
		jobsStore.setState(s => {
			if (!(id in s.completedResults)) return s;
			const { [id]: _removed, ...completedResults } = s.completedResults;
			return { ...s, completedResults };
		});
	},

	dismissResult(id: string) {
		batch(() => {
			jobActions.clearResult(id);
			jobActions.removeJob(id);
		});
	},

	// -------------------------------------------------------------------------
	// Errors
	// -------------------------------------------------------------------------

	setError(message: string) {
		jobsStore.setState(s => ({ ...s, error: message }));
	},

	clearError() {
		jobsStore.setState(s => ({ ...s, error: null }));
	},

	// -------------------------------------------------------------------------
	// Reset
	// -------------------------------------------------------------------------

	reset() {
		jobsStore.setState(() => createInitialState());
	}
};

// Alias for consistency with the finance store naming.
export const jobsActions = jobActions;
