import {
	mutationOptions,
	type QueryClient,
	queryOptions
} from "@tanstack/react-query";

import type { Indicator } from "@/lib/features/development";
import {
	addVisitMeasurementWithZScoreFn,
	deleteMeasurementFn,
	getChildDailyMeasurementsFn,
	getGrowthCurvesFn,
	latestPatientPanelFn
} from "@/server/functions/growth-and-development.functions";

export type GrowthMetricCode = "wfa" | "lhfa";

export type GrowthSex = "male" | "female";

export type GrowthCurveParams = {
	indicator: Indicator;
	sex: GrowthSex;
	min?: number;
	max?: number;
};

export type RecordGrowthMeasurementInput = Parameters<
	typeof addVisitMeasurementWithZScoreFn
>[0]["data"];

export type DeleteGrowthMeasurementInput = Parameters<
	typeof deleteMeasurementFn
>[0]["data"];

export const growthQueryKeys = {
	all: ["growth"] as const,

	curves: (params: GrowthCurveParams) =>
		[
			"growth",
			"curves",
			params.indicator,
			params.sex,
			params.min ?? 0,
			params.max ?? 60
		] as const,

	patient: (patientId: string) => ["growth", "patient", patientId] as const,

	measurements: (patientId: string, metric: GrowthMetricCode) =>
		[...growthQueryKeys.patient(patientId), "measurements", metric] as const,

	latestPanel: (patientId: string) =>
		[...growthQueryKeys.patient(patientId), "latest-panel"] as const
};

export const growthQueryOptions = {
	curves: (params: GrowthCurveParams) => {
		const min = params.min ?? 0;
		const max = params.max ?? 60;

		return queryOptions({
			queryKey: growthQueryKeys.curves(params),
			queryFn: () => {
				const data =
					params.indicator === "weight-for-length"
						? {
								indicator: params.indicator,
								sex: params.sex,
								xAxis: "length" as const,
								min,
								max
							}
						: {
								indicator: params.indicator,
								sex: params.sex,
								xAxis: "age" as const,
								min,
								max
							};
				return getGrowthCurvesFn({ data });
			},
			staleTime: 24 * 60 * 60_000,
			gcTime: 7 * 24 * 60 * 60_000
		});
	},

	measurements: (patientId: string, metric: GrowthMetricCode, enabled = true) =>
		queryOptions({
			queryKey: growthQueryKeys.measurements(patientId, metric),
			queryFn: () =>
				getChildDailyMeasurementsFn({
					data: { patientId, metric }
				}),
			enabled: enabled && patientId.length > 0,
			staleTime: 30_000
		}),

	latestPanel: (patientId: string, enabled = true) =>
		queryOptions({
			queryKey: growthQueryKeys.latestPanel(patientId),
			queryFn: () =>
				latestPatientPanelFn({
					data: { patientId }
				}),
			enabled: enabled && patientId.length > 0,
			staleTime: 15_000
		})
};

async function invalidatePatientGrowth(
	queryClient: QueryClient,
	patientId: string
) {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: growthQueryKeys.patient(patientId)
		}),
		queryClient.invalidateQueries({
			queryKey: ["patients", "detail", patientId]
		})
	]);
}

export const growthMutationOptions = {
	record: (queryClient: QueryClient) =>
		mutationOptions({
			mutationKey: ["growth", "measurement", "record"] as const,

			mutationFn: (input: RecordGrowthMeasurementInput) =>
				addVisitMeasurementWithZScoreFn({ data: input }),

			onSuccess: async (_result, variables) => {
				await invalidatePatientGrowth(queryClient, variables.patientId);
			}
		}),

	delete: (queryClient: QueryClient) =>
		mutationOptions({
			mutationKey: ["growth", "measurement", "delete"] as const,

			mutationFn: (input: DeleteGrowthMeasurementInput) =>
				deleteMeasurementFn({ data: input }),

			onSuccess: async (_result, variables) => {
				await invalidatePatientGrowth(queryClient, variables.patientId);
			}
		})
};
