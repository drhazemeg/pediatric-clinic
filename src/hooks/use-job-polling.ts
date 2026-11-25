// apps/web/src/hooks/use-job-polling.ts

import { useQueries } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clinicalActions } from "#/integrations/tanstack-store/clinical-store.ts";
import { jobQueryOptions } from "@/lib/features/jobs/query-options";
import {
	type ActiveJob,
	isTerminal,
	type JobTransport,
	type JobTransportEvent
} from "./use-job-shared";

function jobStatusRefetchInterval(query: unknown): number | false {
	const data = (
		query as { state: { data: { status: string } | null | undefined } }
	).state.data;
	if (data == null) return 1000;
	if (isTerminal(data.status)) return false;
	return 1000;
}

function serializeSnapshot(jobs: ActiveJob[]): string {
	return jobs
		.map(j => {
			const logsLen = Array.isArray(j.logs) ? j.logs.length : 0;
			return [
				j.id,
				j.status,
				j.progress ?? 0,
				j.progressMessage ?? "",
				logsLen
			].join(":");
		})
		.sort()
		.join("|");
}

export function useJobPolling({
	isAuthenticated
}: {
	isAuthenticated: boolean;
}): JobTransport {
	const [jobIds, setJobIds] = useState<string[]>([]);
	const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
	const activeJobsRef = useRef(activeJobs);
	activeJobsRef.current = activeJobs;

	const onUpdateRef = useRef<((event: JobTransportEvent) => void) | undefined>(
		undefined
	);
	const onErrorRef = useRef<(error: Error) => void>(undefined);

	const prevSnapshotRef = useRef("");
	const prevStatusesRef = useRef<Record<string, string>>({});

	const jobQueries = useQueries({
		queries: jobIds.map(jobId => ({
			...jobQueryOptions.get(jobId, Boolean(jobId) && isAuthenticated),
			enabled: Boolean(jobId) && isAuthenticated,
			refetchInterval: jobStatusRefetchInterval
		}))
	});

	const queriesRef = useRef(jobQueries);
	queriesRef.current = jobQueries;

	useEffect(() => {
		if (!jobIds.length) return;
		const currentQueries = queriesRef.current;

		const nextActive = currentQueries
			.filter(q => q.data && !isTerminal((q.data as { status: string }).status))
			.map(q => q.data as unknown as ActiveJob);

		const nextIds = serializeSnapshot(nextActive);
		if (prevSnapshotRef.current !== nextIds) {
			prevSnapshotRef.current = nextIds;
			setActiveJobs(nextActive);
		}

		for (let i = 0; i < currentQueries.length; i++) {
			const query = currentQueries[i];
			const jobId = jobIds[i];
			if (!jobId || !query?.data) continue;

			const data = query.data as { status: string } & {
				resultJson?: unknown;
				result?: unknown;
				errorMessage?: unknown;
			};
			const status = data.status as string;
			if (prevStatusesRef.current[jobId] === status) continue;

			prevStatusesRef.current[jobId] = status;

			if (isTerminal(status)) {
				clinicalActions.recordAiResult(jobId, {
					status: status === "failed" ? "failed" : "completed",
					result: data.resultJson ?? data.result,
					errorMessage:
						typeof data.errorMessage === "string"
							? data.errorMessage
							: undefined
				});
			}

			onUpdateRef.current?.({ jobId, status, data });
		}
	}, [jobIds]);

	const subscribe = useCallback((ids: string[]) => {
		setJobIds(prev =>
			prev.length === ids.length && prev.every((id, i) => id === ids[i])
				? prev
				: ids
		);
	}, []);

	const unsubscribe = useCallback(() => {
		prevSnapshotRef.current = "";
		prevStatusesRef.current = {};
		setJobIds([]);
		setActiveJobs([]);
	}, []);

	const onUpdate = useCallback((cb: (event: JobTransportEvent) => void) => {
		onUpdateRef.current = cb;
	}, []);

	const onError = useCallback((cb: (error: Error) => void) => {
		onErrorRef.current = cb;
	}, []);

	return useMemo(
		() => ({
			subscribe,
			unsubscribe,
			onUpdate,
			onError,
			get activeJobs() {
				return activeJobsRef.current;
			}
		}),
		[subscribe, unsubscribe, onUpdate, onError]
	);
}
