import {
	mutationOptions,
	type QueryClient,
	queryOptions
} from "@tanstack/react-query";
import {
	createVisitFn,
	getVisitFn,
	listPatientVisitsFn,
	updateVisitFn
} from "@/server/functions/visits.functions";

export type CreateVisitInput = Parameters<typeof createVisitFn>[0]["data"];
export type UpdateVisitInput = Parameters<typeof updateVisitFn>[0]["data"];

export const visitQueryKeys = {
	all: ["visits"] as const,
	details: () => [...visitQueryKeys.all, "detail"] as const,
	detail: (id: string) => [...visitQueryKeys.details(), id] as const,
	byPatient: (patientId: string) =>
		[...visitQueryKeys.all, "patient", patientId] as const,
	byClinic: (clinicId: string) =>
		[...visitQueryKeys.all, "clinic", clinicId] as const
};

export const visitQueryOptions = {
	detail: (id: string) =>
		queryOptions({
			queryKey: visitQueryKeys.detail(id),
			queryFn: () => getVisitFn({ data: { id } }),
			staleTime: 20_000,
			gcTime: 10 * 60_000
		}),
	byPatient: (patientId: string) =>
		queryOptions({
			queryKey: visitQueryKeys.byPatient(patientId),
			queryFn: () => listPatientVisitsFn({ data: { patientId } }),
			staleTime: 20_000,
			gcTime: 10 * 60_000
		})
};

export function createVisitMutationOptions(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ["visits", "create"] as const,
		mutationFn: (input: CreateVisitInput) => createVisitFn({ data: input }),
		onSuccess: async (created, variables) => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: visitQueryKeys.byPatient(
						created?.patientId ?? variables.patientId
					)
				}),
				queryClient.invalidateQueries({
					queryKey: visitQueryKeys.byClinic(
						created?.clinicId ?? variables.clinicId
					)
				})
			]);
		}
	});
}

export function updateVisitMutationOptions(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ["visits", "update"] as const,
		mutationFn: (input: UpdateVisitInput) => updateVisitFn({ data: input }),
		onSuccess: async (updated, variables) => {
			const visitId = updated?.id ?? variables.id;
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: visitQueryKeys.detail(visitId)
				}),
				...(updated?.patientId
					? [
							queryClient.invalidateQueries({
								queryKey: visitQueryKeys.byPatient(updated.patientId)
							})
						]
					: []),
				...(updated?.clinicId
					? [
							queryClient.invalidateQueries({
								queryKey: visitQueryKeys.byClinic(updated.clinicId)
							})
						]
					: [])
			]);
		}
	});
}

export function completeVisitMutationOptions(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ["visits", "complete"] as const,
		mutationFn: (input: { id: string; patientId: string }) =>
			updateVisitFn({ data: { id: input.id, patch: { status: "completed" } } }),
		onSuccess: async (_updated, variables) => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: visitQueryKeys.detail(variables.id)
				}),
				queryClient.invalidateQueries({
					queryKey: visitQueryKeys.byPatient(variables.patientId)
				})
			]);
		}
	});
}
