// src/features/patients/queries.options.ts

import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
	fetchGrowthCurvesFn,
	fetchGrowthSeriesFn,
	fetchPatientDetailFn,
	fetchPatientsListFn,
	getPatientByMrnFn
} from "#/server/functions/patients.functions.ts";
import type {
	growthCurvesInputSchema,
	growthSeriesInputSchema
} from "./schemas";

// Server functions defined directly at module top-level (no helper wrapper).
// DB queries live in server-only modules imported inside the server handler.

export const patientQueryKeys = {
	all: ["patients"] as const,
	patientByMrn: (clinicId: string, mrn: string) =>
		[...patientQueryKeys.all, "by-mrn", clinicId, mrn] as const,
	lists: () => [...patientQueryKeys.all, "list"] as const,
	list: (clinicId: string, q?: string) =>
		[...patientQueryKeys.lists(), { clinicId, q: q?.trim() ?? "" }] as const,
	details: () => [...patientQueryKeys.all, "detail"] as const,
	detail: (patientId: string) =>
		[...patientQueryKeys.details(), patientId] as const,
	growth: (patientId: string) => ["growth", patientId] as const,
	growthSeries: (
		patientId: string,
		indicator: z.infer<typeof growthSeriesInputSchema>["indicator"]
	) => [...patientQueryKeys.growth(patientId), "series", indicator] as const,
	growthCurves: (params: z.infer<typeof growthCurvesInputSchema>) =>
		[
			"growth",
			"curves",
			params.indicator,
			params.sex,
			params.xAxis,
			params.min,
			params.max
		] as const
};

export function patientsListQueryOptions(clinicId: string, q?: string) {
	const trimmed = q?.trim() ?? "";
	return queryOptions({
		queryKey: patientQueryKeys.list(clinicId, trimmed),
		queryFn: () =>
			fetchPatientsListFn({
				data: { clinicId, q: trimmed || undefined }
			}),
		staleTime: 15_000,
		gcTime: 5 * 60_000
	});
}

// features/patients/queries.options.ts

export function patientDetailQueryOptions(patientId: string) {
	return queryOptions({
		queryKey: patientQueryKeys.detail(patientId),
		queryFn: () => fetchPatientDetailFn({ data: { patientId } }),
		enabled: patientId.length > 0,
		staleTime: 30_000,
		gcTime: 10 * 60_000
	});
}

export function patientByMrnQueryOptions(clinicId: string, mrn: string) {
	return queryOptions({
		queryKey: patientQueryKeys.patientByMrn(clinicId, mrn),
		queryFn: () =>
			getPatientByMrnFn({
				data: { clinicId, mrn }
			}),
		staleTime: 30_000
	});
}

export function patientGrowthSeriesQueryOptions(
	patientId: string,
	indicator: z.infer<typeof growthSeriesInputSchema>["indicator"]
) {
	return queryOptions({
		queryKey: patientQueryKeys.growthSeries(patientId, indicator),
		queryFn: () => fetchGrowthSeriesFn({ data: { patientId, indicator } }),
		staleTime: 60_000,
		gcTime: 15 * 60_000
	});
}

export function growthReferenceCurvesQueryOptions(
	params: z.infer<typeof growthCurvesInputSchema>
) {
	return queryOptions({
		queryKey: patientQueryKeys.growthCurves(params),
		queryFn: () => fetchGrowthCurvesFn({ data: params }),
		// Reference curves (Egyptian 2021 LMS) are static reference data.
		staleTime: 24 * 60 * 60_000,
		gcTime: 7 * 24 * 60 * 60_000
	});
}
