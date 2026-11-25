// apps/web/src/hooks/use-prescriptions.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	cancelPrescriptionMutationOptions,
	createPrescriptionRecordMutationOptions,
	prescriptionQueryOptions
} from "@/lib/features/prescriptions/query-options";
import { getErrorMessage } from "@/lib/web/error-utils";
import { useDebounce } from "./use-debounce";

export function useFormularySearch(query: string, limit = 10) {
	const [debounced] = useDebounce(query, 300);
	return useQuery(
		prescriptionQueryOptions.searchFormulary(
			debounced,
			limit,
			debounced.trim().length >= 2
		)
	);
}

export function useDrugMonograph(drugId: string | null) {
	return useQuery(
		prescriptionQueryOptions.drugMonograph(drugId ?? "", !!drugId)
	);
}

export function usePrescriptionsForVisit(visitId: string | null) {
	return useQuery({
		...prescriptionQueryOptions.byVisit(visitId ?? ""),
		enabled: !!visitId
	});
}

export function useCreatePrescription() {
	const qc = useQueryClient();
	return useMutation({
		...createPrescriptionRecordMutationOptions(qc),
		onSuccess: () => {
			toast.success("Prescription saved");
		},
		onError: err =>
			toast.error("Prescription failed", {
				description: getErrorMessage(err)
			})
	});
}

export function useCancelPrescription() {
	const qc = useQueryClient();
	return useMutation({
		...cancelPrescriptionMutationOptions(qc),
		onSuccess: () => {
			toast.success("Prescription cancelled");
		},
		onError: err =>
			toast.error("Cancel failed", { description: getErrorMessage(err) })
	});
}
