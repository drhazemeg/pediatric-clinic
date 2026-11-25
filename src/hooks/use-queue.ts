// apps/web/src/hooks/use-queue.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import {
	clinicalActions,
	type QueueEntry,
	type QueueStatus
} from "#/integrations/tanstack-store/clinical-store.ts";
import {
	queueMutationOptions,
	queueQueryKeys,
	queueQueryOptions
} from "@/lib/features/queue/query-options";
import { getErrorMessage } from "@/lib/web/error-utils";

export function useQueueToday(clinicId: string | null) {
	return useQuery(queueQueryOptions.today(clinicId ?? "", !!clinicId, 3000));
}

export function useEnqueuePatient() {
	const qc = useQueryClient();
	return useMutation({
		...queueMutationOptions.enqueue(),
		onSuccess: (_, vars) => {
			toast.success("Added to queue");
			qc.invalidateQueries({
				queryKey: queueQueryKeys.today(vars.clinicId)
			});
		},
		onError: err =>
			toast.error("Enqueue failed", { description: getErrorMessage(err) })
	});
}

export function useUpdateQueueStatus() {
	const qc = useQueryClient();
	return useMutation({
		...queueMutationOptions.updateStatus(),
		onSuccess: data => {
			qc.invalidateQueries({
				queryKey: queueQueryKeys.today(data.clinicId)
			});
		},
		onError: err =>
			toast.error("Queue update failed", {
				description: getErrorMessage(err)
			})
	});
}

export function useCallNext() {
	const qc = useQueryClient();
	return useMutation({
		...queueMutationOptions.callNext(),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({
				queryKey: queueQueryKeys.today(vars.clinicId)
			});
		},
		onError: err =>
			toast.error("Call next failed", { description: getErrorMessage(err) })
	});
}
/** Keeps clinicStore.queue in sync with the queue query. */
export function useSyncQueueToStore(clinicId: string) {
	const query = useQuery(queueQueryOptions.today(clinicId, !!clinicId));

	useEffect(() => {
		if (!query.data) return;
		const mapped: QueueEntry[] = query.data.map(row => ({
			id: row.id,
			patientId: row.patientId,
			patientName:
				`${row.patient?.firstName ?? ""} ${row.patient?.lastName ?? ""}`.trim(),
			mrn: row.patient?.mrn ?? "",
			priority: (row.priority ?? 0) as 0 | 1 | 2,
			status: row.status.toLowerCase() as QueueStatus,
			enqueuedAt: new Date(row.createdAt).getTime()
		}));
		clinicalActions.setQueue(mapped);
	}, [query.data]);

	return query;
}
