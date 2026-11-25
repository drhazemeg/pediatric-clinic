import { mutationOptions, queryOptions } from "@tanstack/react-query";
import {
	DEVELOPMENTAL_MILESTONES,
	type DevelopmentalMilestone
} from "@/lib/features/development";
import {
	bulkSetMilestonesFn,
	getDevelopmentSnapshotFn,
	setMilestoneFn
} from "@/server/functions/growth-and-development.functions";

export const developmentQueryKeys = {
	all: ["development"] as const,
	catalog: () => [...developmentQueryKeys.all, "catalog"] as const,
	snapshot: (patientId: string) =>
		[...developmentQueryKeys.all, "snapshot", patientId] as const
};

export const developmentQueryOptions = {
	catalog: () =>
		queryOptions({
			queryKey: developmentQueryKeys.catalog(),
			queryFn: async (): Promise<DevelopmentalMilestone[]> =>
				DEVELOPMENTAL_MILESTONES,
			staleTime: Number.POSITIVE_INFINITY
		}),
	snapshot: (patientId: string, enabled = true) =>
		queryOptions({
			queryKey: developmentQueryKeys.snapshot(patientId),
			queryFn: () => getDevelopmentSnapshotFn({ data: { patientId } }),
			enabled: enabled && patientId.length > 0
		})
};

export const developmentMutationOptions = {
	recordMilestone: () =>
		mutationOptions({
			mutationKey: ["development", "milestone", "record"] as const,
			mutationFn: (input: Parameters<typeof setMilestoneFn>[0]["data"]) =>
				setMilestoneFn({ data: input })
		}),
	bulkRecord: () =>
		mutationOptions({
			mutationKey: ["development", "milestone", "bulk"] as const,
			mutationFn: (input: Parameters<typeof bulkSetMilestonesFn>[0]["data"]) =>
				bulkSetMilestonesFn({ data: input })
		})
};
