// apps/web/src/hooks/use-patients.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	patientByMrnQueryOptions,
	patientDetailQueryOptions,
	patientMutationOptions,
	patientQueryKeys,
	patientsListQueryOptions
} from "#/lib/features/patients/query-options";
import { getErrorMessage } from "@/lib/web/error-utils";
import { useDebounce } from "./use-debounce";

export function usePatientList(opts?: { clinicId?: string; search?: string }) {
	const [debouncedSearch] = useDebounce(opts?.search ?? "", 300);

	const query = useQuery({
		...patientsListQueryOptions(
			opts?.clinicId ?? "",
			debouncedSearch || undefined
		),
		enabled: !!opts?.clinicId
	});

	return {
		patients: query.data ?? [],
		total: query.data?.length ?? 0,
		isLoading: query.isLoading,
		refetch: query.refetch
	};
}

export function usePatient(id: string | null) {
	return useQuery(patientDetailQueryOptions(id ?? ""));
}

export function usePatientByMrn(clinicId: string | null, mrn: string | null) {
	return useQuery({
		...patientByMrnQueryOptions(clinicId ?? "", mrn ?? ""),
		enabled: !!clinicId && !!mrn
	});
}

export function useCreatePatient() {
	const qc = useQueryClient();
	const mutation = useMutation({
		...patientMutationOptions.create(),
		onSuccess: () => {
			toast.success("Patient created");
			qc.invalidateQueries({ queryKey: patientQueryKeys.lists() });
		},
		onError: err =>
			toast.error("Failed to create patient", {
				description: getErrorMessage(err)
			})
	});
	return { create: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useUpdatePatient() {
	const qc = useQueryClient();
	const mutation = useMutation({
		...patientMutationOptions.update(),
		onSuccess: (_, vars) => {
			toast.success("Patient updated");
			qc.invalidateQueries({ queryKey: patientQueryKeys.detail(vars.id) });
			qc.invalidateQueries({ queryKey: patientQueryKeys.lists() });
		},
		onError: err =>
			toast.error("Update failed", { description: getErrorMessage(err) })
	});
	return { update: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useArchivePatient() {
	const qc = useQueryClient();
	const mutation = useMutation({
		...patientMutationOptions.archive(),
		onSuccess: () => {
			toast.success("Patient archived");
			qc.invalidateQueries({ queryKey: patientQueryKeys.lists() });
		},
		onError: err =>
			toast.error("Failed to archive patient", {
				description: getErrorMessage(err)
			})
	});
	return { archive: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useLinkGuardian() {
	const qc = useQueryClient();
	const mutation = useMutation({
		...patientMutationOptions.linkGuardian(),
		onSuccess: (_, vars) => {
			toast.success("Guardian linked");
			qc.invalidateQueries({
				queryKey: patientQueryKeys.detail(vars.patientId)
			});
		},
		onError: err =>
			toast.error("Failed to link guardian", {
				description: getErrorMessage(err)
			})
	});
	return { link: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useUnlinkGuardian() {
	const qc = useQueryClient();
	const mutation = useMutation({
		...patientMutationOptions.unlinkGuardian(),
		onSuccess: (_, vars) => {
			toast.success("Guardian unlinked");
			qc.invalidateQueries({
				queryKey: patientQueryKeys.detail(vars.patientId)
			});
		},
		onError: err =>
			toast.error("Failed to unlink guardian", {
				description: getErrorMessage(err)
			})
	});
	return { unlink: mutation.mutateAsync, isPending: mutation.isPending };
}
