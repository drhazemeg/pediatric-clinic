// src/features/prescriptions/queries-and-mutations.options.ts
import {
	mutationOptions,
	type QueryClient,
	queryOptions
} from "@tanstack/react-query";
import {
	countPatientPrescriptionsFn,
	createPrescriptionBatchFn,
	createPrescriptionRecordFn,
	deletePrescriptionFn,
	findFormularyDrugFn,
	getDrugMonographFn,
	getPatientAndVisitForPrescriptionFn,
	getPrescriptionFn,
	getPrescriptionWithContextFn,
	listActivePatientPrescriptionsFn,
	listOtherActivePrescriptionsFn,
	listPatientPrescriptionsFn,
	listPrescriptionRegisterFn,
	listPrescriptionsByPrescriberFn,
	listVisitPrescriptionsFn,
	renewPrescriptionFn,
	savePrescriptionTransactionalFn,
	searchDrugFormularyFn,
	topMedicationsForClinicFn,
	updatePrescriptionFn
} from "@/server/functions/prescriptions.functions";

export type PrescriptionStatusFilter =
	| "all"
	| "active"
	| "completed"
	| "cancelled";

export interface PrescriptionRegisterParams {
	clinicId: string;
	q?: string;
	medication?: string;
	prescriberId?: string;
	status?: PrescriptionStatusFilter;
	from?: string;
	to?: string;
	page?: number;
	size?: number;
}

export type CreatePrescriptionRecordInput = Parameters<
	typeof createPrescriptionRecordFn
>[0]["data"];

export type SavePrescriptionTransactionalInput = Parameters<
	typeof savePrescriptionTransactionalFn
>[0]["data"];

export type UpdatePrescriptionRecordInput = Parameters<
	typeof updatePrescriptionFn
>[0]["data"];

export type RenewPrescriptionInput = Parameters<
	typeof renewPrescriptionFn
>[0]["data"];

export type DeletePrescriptionInput = Parameters<
	typeof deletePrescriptionFn
>[0]["data"];

export const prescriptionQueryKeys = {
	all: ["prescriptions"] as const,
	detail: (id: string) => [...prescriptionQueryKeys.all, "detail", id] as const,
	context: (id: string) =>
		[...prescriptionQueryKeys.all, "context", id] as const,
	byVisit: (visitId: string) =>
		[...prescriptionQueryKeys.all, "visit", visitId] as const,
	byPatient: (patientId: string) =>
		[...prescriptionQueryKeys.all, "patient", patientId] as const,
	activeByPatient: (patientId: string) =>
		[...prescriptionQueryKeys.byPatient(patientId), "active"] as const,
	otherActive: (patientId: string, excludeId?: string) =>
		[
			...prescriptionQueryKeys.byPatient(patientId),
			"other-active",
			excludeId ?? ""
		] as const,
	countByPatient: (patientId: string) =>
		[...prescriptionQueryKeys.byPatient(patientId), "count"] as const,
	byPrescriber: (userId: string, limit = 100) =>
		[...prescriptionQueryKeys.all, "prescriber", userId, limit] as const,
	register: (params: PrescriptionRegisterParams) =>
		[
			...prescriptionQueryKeys.all,
			"register",
			{
				clinicId: params.clinicId,
				q: params.q?.trim() ?? "",
				medication: params.medication?.trim() ?? "",
				prescriberId: params.prescriberId ?? "",
				status: params.status ?? "all",
				from: params.from ?? "",
				to: params.to ?? "",
				page: params.page ?? 1,
				size: params.size ?? 25
			}
		] as const,
	patientVisitContext: (
		clinicId: string,
		patientId: string,
		visitId?: string
	) =>
		[
			...prescriptionQueryKeys.all,
			"encounter-context",
			clinicId,
			patientId,
			visitId ?? ""
		] as const,
	formularyDrug: (name: string) =>
		[
			...prescriptionQueryKeys.all,
			"formulary",
			name.trim().toLowerCase()
		] as const,
	formularySearch: (query: string, limit: number) =>
		[
			...prescriptionQueryKeys.all,
			"formulary-search",
			query.trim().toLowerCase(),
			limit
		] as const,
	drugMonograph: (drugId: string) =>
		[...prescriptionQueryKeys.all, "monograph", drugId] as const,
	topClinicMedications: (clinicId: string, limit = 20) =>
		[...prescriptionQueryKeys.all, "clinic", clinicId, "top", limit] as const
};

export const prescriptionQueryOptions = {
	detail: (id: string) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.detail(id),
			queryFn: () => getPrescriptionFn({ data: { id } }),
			staleTime: 20_000,
			gcTime: 10 * 60_000
		}),

	context: (id: string) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.context(id),
			queryFn: () => getPrescriptionWithContextFn({ data: { id } }),
			staleTime: 20_000,
			gcTime: 10 * 60_000
		}),

	byVisit: (visitId: string) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.byVisit(visitId),
			queryFn: () => listVisitPrescriptionsFn({ data: { visitId } }),
			staleTime: 20_000,
			gcTime: 10 * 60_000
		}),

	byPatient: (patientId: string) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.byPatient(patientId),
			queryFn: () => listPatientPrescriptionsFn({ data: { patientId } }),
			staleTime: 20_000,
			gcTime: 10 * 60_000
		}),

	activeByPatient: (patientId: string) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.activeByPatient(patientId),
			queryFn: () => listActivePatientPrescriptionsFn({ data: { patientId } }),
			staleTime: 15_000,
			gcTime: 10 * 60_000
		}),

	otherActive: (patientId: string, excludeId?: string) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.otherActive(patientId, excludeId),
			queryFn: () =>
				listOtherActivePrescriptionsFn({ data: { patientId, excludeId } }),
			staleTime: 15_000,
			gcTime: 5 * 60_000
		}),

	countByPatient: (patientId: string) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.countByPatient(patientId),
			queryFn: () => countPatientPrescriptionsFn({ data: { patientId } }),
			staleTime: 30_000,
			gcTime: 10 * 60_000
		}),

	byPrescriber: (userId: string, limit = 100) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.byPrescriber(userId, limit),
			queryFn: () =>
				listPrescriptionsByPrescriberFn({ data: { userId, limit } }),
			staleTime: 30_000,
			gcTime: 10 * 60_000
		}),

	register: (params: PrescriptionRegisterParams) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.register(params),
			queryFn: () =>
				listPrescriptionRegisterFn({
					data: {
						clinicId: params.clinicId,
						q: params.q?.trim() || undefined,
						medication: params.medication?.trim() || undefined,
						prescriberId: params.prescriberId,
						status: params.status ?? "all",
						from: params.from,
						to: params.to,
						page: params.page ?? 1,
						size: params.size ?? 25
					}
				}),
			staleTime: 15_000,
			gcTime: 5 * 60_000
		}),

	patientVisitContext: (
		clinicId: string,
		patientId: string,
		visitId?: string
	) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.patientVisitContext(
				clinicId,
				patientId,
				visitId
			),
			queryFn: () =>
				getPatientAndVisitForPrescriptionFn({
					data: { clinicId, patientId, visitId }
				}),
			staleTime: 30_000,
			gcTime: 10 * 60_000
		}),

	formularyDrug: (name: string) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.formularyDrug(name),
			queryFn: () => findFormularyDrugFn({ data: { name: name.trim() } }),
			enabled: name.trim().length > 0,
			// Formulary reference monographs change infrequently.
			staleTime: 60 * 60_000,
			gcTime: 24 * 60 * 60_000
		}),

	searchFormulary: (query: string, limit = 10, enabled = true) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.formularySearch(query, limit),
			queryFn: () =>
				searchDrugFormularyFn({
					data: { query: query.trim(), limit }
				}),
			enabled: enabled && query.trim().length >= 2,
			staleTime: 60 * 60_000
		}),

	drugMonograph: (drugId: string, enabled = true) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.drugMonograph(drugId),
			queryFn: () => getDrugMonographFn({ data: { drugId } }),
			enabled: enabled && drugId.length > 0,
			staleTime: 60 * 60_000
		}),

	topClinicMedications: (clinicId: string, limit = 20) =>
		queryOptions({
			queryKey: prescriptionQueryKeys.topClinicMedications(clinicId, limit),
			queryFn: () => topMedicationsForClinicFn({ data: { clinicId, limit } }),
			staleTime: 60_000,
			gcTime: 15 * 60_000
		})
};

async function invalidatePrescriptionQueries(
	queryClient: QueryClient,
	opts: { id?: string; patientId?: string; visitId?: string }
) {
	const tasks: Promise<unknown>[] = [
		queryClient.invalidateQueries({
			queryKey: [...prescriptionQueryKeys.all, "register"]
		}),
		queryClient.invalidateQueries({
			queryKey: [...prescriptionQueryKeys.all, "prescriber"]
		}),
		queryClient.invalidateQueries({
			queryKey: [...prescriptionQueryKeys.all, "clinic"]
		})
	];

	if (opts.id) {
		tasks.push(
			queryClient.invalidateQueries({
				queryKey: prescriptionQueryKeys.detail(opts.id)
			}),
			queryClient.invalidateQueries({
				queryKey: prescriptionQueryKeys.context(opts.id)
			})
		);
	}

	if (opts.patientId) {
		tasks.push(
			queryClient.invalidateQueries({
				queryKey: prescriptionQueryKeys.byPatient(opts.patientId)
			})
		);
	}

	if (opts.visitId) {
		tasks.push(
			queryClient.invalidateQueries({
				queryKey: prescriptionQueryKeys.byVisit(opts.visitId)
			})
		);
	}

	await Promise.all(tasks);
}

export function createPrescriptionRecordMutationOptions(
	queryClient: QueryClient
) {
	return mutationOptions({
		mutationKey: ["prescriptions", "create"] as const,
		mutationFn: (input: CreatePrescriptionRecordInput) =>
			createPrescriptionRecordFn({ data: input }),
		onSuccess: async (row, variables) => {
			const result = row as
				| { id?: string; patientId?: string; visitId?: string }
				| undefined;
			await invalidatePrescriptionQueries(queryClient, {
				id: result?.id,
				patientId: result?.patientId ?? variables.patientId,
				visitId: result?.visitId ?? variables.visitId
			});
		}
	});
}

export function createPrescriptionsBatchMutationOptions(
	queryClient: QueryClient
) {
	return mutationOptions({
		mutationKey: ["prescriptions", "create-batch"] as const,
		mutationFn: (rows: CreatePrescriptionRecordInput[]) =>
			createPrescriptionBatchFn({ data: { rows } }),
		onSuccess: async (rows, variables) => {
			const created = rows as Array<{ patientId?: string; visitId?: string }>;
			const patientIds = new Set<string>([
				...variables.map(r => r.patientId),
				...created.flatMap(r => (r.patientId ? [r.patientId] : []))
			]);
			const visitIds = new Set<string>([
				...variables.map(r => r.visitId),
				...created.flatMap(r => (r.visitId ? [r.visitId] : []))
			]);

			await Promise.all([
				...Array.from(patientIds).map(patientId =>
					invalidatePrescriptionQueries(queryClient, { patientId })
				),
				...Array.from(visitIds).map(visitId =>
					queryClient.invalidateQueries({
						queryKey: prescriptionQueryKeys.byVisit(visitId)
					})
				)
			]);
		}
	});
}

export function savePrescriptionTransactionalMutationOptions(
	queryClient: QueryClient
) {
	return mutationOptions({
		mutationKey: ["prescriptions", "save-transactional"] as const,
		mutationFn: (input: SavePrescriptionTransactionalInput) =>
			savePrescriptionTransactionalFn({ data: input }),
		onSuccess: async (saved, variables) => {
			const result = saved as {
				id?: string;
				patientId?: string;
				visitId?: string;
			};
			await invalidatePrescriptionQueries(queryClient, {
				id: result.id ?? variables.prescriptionId,
				patientId: result.patientId ?? variables.patientId,
				visitId: result.visitId ?? variables.visitId
			});
		}
	});
}

export function updatePrescriptionMutationOptions(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ["prescriptions", "update"] as const,
		mutationFn: (input: UpdatePrescriptionRecordInput) =>
			updatePrescriptionFn({ data: input }),
		onSuccess: async (row, variables) => {
			const result = row as
				| { id?: string; patientId?: string; visitId?: string }
				| undefined;
			await invalidatePrescriptionQueries(queryClient, {
				id: result?.id ?? variables.id,
				patientId: result?.patientId,
				visitId: result?.visitId
			});
		}
	});
}

export function renewPrescriptionMutationOptions(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ["prescriptions", "renew"] as const,
		mutationFn: (input: RenewPrescriptionInput) =>
			renewPrescriptionFn({ data: input }),
		onSuccess: async (renewed, variables) => {
			const result = renewed as
				| { id?: string; patientId?: string; visitId?: string }
				| undefined;
			await invalidatePrescriptionQueries(queryClient, {
				id: result?.id ?? variables.id,
				patientId: result?.patientId,
				visitId: result?.visitId
			});
		}
	});
}

export function deletePrescriptionMutationOptions(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ["prescriptions", "delete"] as const,
		mutationFn: (input: DeletePrescriptionInput) =>
			deletePrescriptionFn({ data: input }),
		onSuccess: async (_res, variables) => {
			await invalidatePrescriptionQueries(queryClient, {
				id: variables.id,
				patientId: variables.patientId,
				visitId: variables.visitId
			});
		}
	});
}

export function cancelPrescriptionMutationOptions(queryClient: QueryClient) {
	return mutationOptions({
		mutationKey: ["prescriptions", "cancel"] as const,
		mutationFn: ({ id }: { id: string }) =>
			updatePrescriptionFn({ data: { id, patch: { status: "cancelled" } } }),
		onSuccess: async (row, variables) => {
			const result = row as
				| { patientId?: string; visitId?: string }
				| undefined;
			await invalidatePrescriptionQueries(queryClient, {
				id: variables.id,
				patientId: result?.patientId,
				visitId: result?.visitId
			});
		}
	});
}
