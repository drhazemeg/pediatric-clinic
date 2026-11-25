// apps/web/src/hooks/use-development.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	developmentMutationOptions,
	developmentQueryKeys,
	developmentQueryOptions
} from "@/lib/features/development/query-options";
import { getErrorMessage } from "@/lib/web/error-utils";

export function useDevelopmentCatalog() {
	return useQuery(developmentQueryOptions.catalog());
}

export function useDevelopmentSnapshot(patientId: string | null) {
	return useQuery(
		developmentQueryOptions.snapshot(patientId ?? "", !!patientId)
	);
}

export function useRecordMilestone() {
	const qc = useQueryClient();
	return useMutation({
		...developmentMutationOptions.recordMilestone(),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({
				queryKey: developmentQueryKeys.snapshot(vars.patientId)
			});
		},
		onError: err =>
			toast.error("Failed to record milestone", {
				description: getErrorMessage(err)
			})
	});
}

export function useBulkRecordMilestones() {
	const qc = useQueryClient();
	return useMutation({
		...developmentMutationOptions.bulkRecord(),
		onSuccess: (_, vars) => {
			toast.success("Milestones saved");
			qc.invalidateQueries({
				queryKey: developmentQueryKeys.snapshot(vars.patientId)
			});
		},
		onError: err =>
			toast.error("Bulk save failed", {
				description: getErrorMessage(err)
			})
	});
}
