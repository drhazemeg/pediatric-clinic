// apps/web/src/hooks/use-jobs.ts

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
	jobActions,
	useJobsStore
} from "@/integrations/tanstack-store/job-store";
import { authClient } from "@/lib/auth-client";
import { cancelJobFn, listJobsFn } from "@/server/functions/jobs.functions";
import { useJobPolling } from "./use-job-polling";
import {
	ACTIVE_STATUSES,
	type CompletedResult,
	isTerminal,
	type JobKind,
	MAX_PARALLEL
} from "./use-job-shared";

export type { ActiveJob, CompletedResult } from "./use-job-shared";

/**
 * Central hook for background jobs (AI tasks + non-AI tasks like
 * growth_recalc). Backs the Jobs page, the AI Assistant panel, and
 * any per-patient job widget.
 */
export function useJobs() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const isAuthenticated = Boolean(session?.user?.id) && !isSessionPending;

	// --- store subscriptions ---
	const jobIds = useJobsStore(s => s.jobIds);
	const completedResults = useJobsStore(s => s.completedResults);
	const error = useJobsStore(s => s.error);
	const processedStates = useJobsStore(s => s.processedStates);
	const removedIds = useJobsStore(s => s.removedIds);

	// --- store actions (stable references from the module-level store) ---
	const addJob = jobActions.addJob;
	const removeJobStore = jobActions.removeJob;
	const resetAll = jobActions.resetAll;
	const setError = jobActions.setError;
	const trackStatus = jobActions.trackStatus;
	const setResult = jobActions.setResult;
	const clearResult = jobActions.clearResult;
	const dismissResult = jobActions.dismissResult;

	// --- fallback discovery — catches jobs started elsewhere ---
	const myJobsQuery = useQuery({
		queryKey: ["jobs", "list", { limit: 20, offset: 0 }] as const,
		queryFn: () => listJobsFn({ data: { limit: 20, offset: 0 } }),
		enabled: isAuthenticated,
		refetchInterval: 5000,
		staleTime: 0,
		gcTime: 5 * 60_000
	});

	// --- polling transport ---
	const { subscribe, unsubscribe, onUpdate, activeJobs } = useJobPolling({
		isAuthenticated
	});

	useEffect(() => {
		subscribe(jobIds);
		return () => unsubscribe();
	}, [jobIds, subscribe, unsubscribe]);

	// --- live update handler ---
	const onUpdateHandlerRef = useRef<
		(event: {
			jobId: string;
			status: string;
			data: Record<string, unknown>;
		}) => void
	>(() => {});

	onUpdateHandlerRef.current = event => {
		const { jobId, status, data } = event;
		const kind = data.kind;
		const prevStatus = processedStates[jobId];
		if (prevStatus === status) return;
		trackStatus(jobId, status);

		const baseResult: CompletedResult = {
			jobId,
			kind: kind as JobKind,
			status: status as CompletedResult["status"],
			result: (data.resultJson as Record<string, unknown> | null) ?? null,
			errorMessage: (data.errorMessage as string) ?? null,
			timestamp: Date.now()
		};

		if (status === "completed" || status === "completed_partial") {
			setResult({
				...baseResult,
				errorMessage: baseResult.errorMessage ?? null
			});
			if (status === "completed_partial" && data.errorMessage) {
				setError(data.errorMessage as string);
			}
		}
		if (status === "failed") {
			setError((data.errorMessage as string) ?? "Job failed");
			clearResult(jobId);
		}
		if (status === "cancelled") {
			clearResult(jobId);
		}
	};

	useEffect(() => {
		onUpdate(event => onUpdateHandlerRef.current(event));
	}, [onUpdate]);

	// --- merge discovered jobs from the server fallback ---
	useEffect(() => {
		const items = myJobsQuery.data?.items;
		if (!Array.isArray(items)) return;
		for (const j of items as Array<{ id: string; status: string }>) {
			if (
				ACTIVE_STATUSES.has(j.status as never) &&
				!removedIds.includes(j.id)
			) {
				if (!jobIds.includes(j.id)) addJob(j.id);
			}
		}
	}, [myJobsQuery.data, removedIds, jobIds]);
	// --- auto-remove terminal jobs after 5s ---
	useEffect(() => {
		const timers = jobIds
			.filter(id => {
				const ev = processedStates[id];
				return ev && isTerminal(ev);
			})
			.map(id => setTimeout(() => removeJobStore(id), 5000));
		return () => timers.forEach(clearTimeout);
	}, [processedStates, jobIds]);

	// --- cancel + forget ---
	const removeJob = (id: string) => {
		cancelJobFn({ data: { id } }).catch(() => {});
		removeJobStore(id);
	};

	const activeCount = activeJobs.length;
	const canAddMore = activeCount < MAX_PARALLEL;
	const isGenerating = activeCount > 0;

	return {
		jobIds,
		activeJobs,
		completedResults,
		activeCount,
		isGenerating,
		canAddMore,
		error,
		addJob,
		removeJob,
		resetAll,
		dismissResult,
		setError,
		myJobsQuery
	};
}

/* ──────────────────────────────────────────────────────────────
 *  Job category hooks — thin wrappers, one per workflow
 * ────────────────────────────────────────────────────────────── */

export function useAiJobs() {
	const all = useJobs();
	const aiActive = all.activeJobs.filter(j => j.kind.startsWith("ai_"));
	const aiResults = Object.values(all.completedResults).filter(r =>
		String(r.kind).startsWith("ai_")
	);
	return { ...all, activeJobs: aiActive, completedResults: aiResults };
}

export function useBackgroundJobs() {
	const all = useJobs();
	const bgActive = all.activeJobs.filter(j => !j.kind.startsWith("ai_"));
	const bgResults = Object.values(all.completedResults).filter(
		r => !r.kind.startsWith("ai_")
	);
	return { ...all, activeJobs: bgActive, completedResults: bgResults };
}
