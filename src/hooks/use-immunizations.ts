// apps/web/src/hooks/use-immunizations.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	immunizationMutationOptions,
	immunizationQueryKeys,
	immunizationQueryOptions
} from "@/lib/features/immunizations/query-options";
import { getErrorMessage } from "@/lib/web/error-utils";

export function useImmunizationSchedule() {
	return useQuery(immunizationQueryOptions.schedule());
}

export function usePatientImmunizations(patientId: string | null) {
	return useQuery(
		immunizationQueryOptions.byPatient(patientId ?? "", !!patientId)
	);
}

export function useImmunizationMatrix(
	clinicId: string | null,
	opts?: {
		ageBracket?: "0-6" | "6-12" | "12-24" | ">24";
		onlyOverdue?: boolean;
	}
) {
	return useQuery(
		immunizationQueryOptions.matrix(
			{ clinicId: clinicId ?? "", ...opts },
			!!clinicId
		)
	);
}

export function useImmunizationCoverage(clinicId: string | null) {
	return useQuery(
		immunizationQueryOptions.coverage(clinicId ?? "", !!clinicId)
	);
}

export function useRecordImmunization() {
	const qc = useQueryClient();
	return useMutation({
		...immunizationMutationOptions.record(),
		onSuccess: (_, vars) => {
			toast.success("Immunization recorded");
			qc.invalidateQueries({
				queryKey: immunizationQueryKeys.byPatient(vars.patientId)
			});
		},
		onError: err =>
			toast.error("Failed to record dose", {
				description: getErrorMessage(err)
			})
	});
}
