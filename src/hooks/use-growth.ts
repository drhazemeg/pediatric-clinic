// apps/web/src/hooks/use-growth.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Indicator } from "@/lib/features/development/index";
import {
	type GrowthMetricCode,
	growthMutationOptions,
	growthQueryOptions
} from "@/lib/features/growth/query-options";
import { getErrorMessage } from "@/lib/web/error-utils";

export type { GrowthMetricCode } from "@/lib/features/growth/query-options";

export function useGrowthCurves(
	indicator: Indicator,
	sex: "male" | "female",
	min = 0,
	max = 60
) {
	return useQuery(growthQueryOptions.curves({ indicator, sex, min, max }));
}

export function usePatientMeasurements(
	patientId: string | null,
	metric: GrowthMetricCode = "wfa"
) {
	return useQuery(
		growthQueryOptions.measurements(patientId ?? "", metric, Boolean(patientId))
	);
}

export function useLatestPanel(patientId: string | null) {
	return useQuery(
		growthQueryOptions.latestPanel(patientId ?? "", Boolean(patientId))
	);
}

export function useRecordMeasurement() {
	const qc = useQueryClient();
	return useMutation({
		...growthMutationOptions.record(qc),
		onSuccess: () => {
			toast.success("Measurement recorded");
		},
		onError: err =>
			toast.error("Failed to record measurement", {
				description: getErrorMessage(err)
			})
	});
}

export function useDeleteMeasurement() {
	const qc = useQueryClient();
	return useMutation({
		...growthMutationOptions.delete(qc),
		onSuccess: () => {
			toast.success("Measurement deleted");
		},
		onError: err =>
			toast.error("Delete failed", { description: getErrorMessage(err) })
	});
}
