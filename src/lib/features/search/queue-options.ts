import {
	mutationOptions,
	type QueryClient,
	queryOptions
} from "@tanstack/react-query";
import {
	enqueueClinicPatientFn,
	listClinicQueueFn,
	updateQueueEntryStatusFn
} from "@/server/functions/queue.functions";

export type EnqueueClinicPatientInput = Parameters<
	typeof enqueueClinicPatientFn
>[0]["data"];

export type UpdateQueueEntryStatusInput = Parameters<
	typeof updateQueueEntryStatusFn
>[0]["data"];

export const queueQueryKeys = {
	all: ["queue"] as const,
	clinic: (clinicId: string) =>
		[...queueQueryKeys.all, "clinic", clinicId] as const,
	daily: (clinicId: string, dateIso?: string) =>
		[...queueQueryKeys.clinic(clinicId), "daily", dateIso ?? "today"] as const
};

export const queueQueryOptions = {
	daily: (clinicId: string, dateIso?: string) =>
		queryOptions({
			queryKey: queueQueryKeys.daily(clinicId, dateIso),
			queryFn: () => listClinicQueueFn({ data: { clinicId, dateIso } }),
			staleTime: 10_000,
			gcTime: 5 * 60_000
		})
};

export function enqueueClinicPatientMutationOptions(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ["queue", "enqueue"] as const,
		mutationFn: (input: EnqueueClinicPatientInput) =>
			enqueueClinicPatientFn({ data: input }),
		onSuccess: async (_created, variables) => {
			await queryClient.invalidateQueries({
				queryKey: queueQueryKeys.clinic(variables.clinicId)
			});
		}
	});
}

export function updateQueueEntryStatusMutationOptions(
	queryClient: QueryClient
) {
	return mutationOptions({
		mutationKey: ["queue", "status", "update"] as const,
		mutationFn: (input: UpdateQueueEntryStatusInput) =>
			updateQueueEntryStatusFn({ data: input }),
		onSuccess: async updated => {
			if (updated?.clinicId) {
				await queryClient.invalidateQueries({
					queryKey: queueQueryKeys.clinic(updated.clinicId)
				});
			} else {
				await queryClient.invalidateQueries({ queryKey: queueQueryKeys.all });
			}
		}
	});
}
