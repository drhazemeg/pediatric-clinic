// apps/web/src/hooks/use-appointments.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	appointmentMutationOptions,
	appointmentQueryKeys,
	appointmentQueryOptions
} from "@/lib/features/appointments/query-options";
import { getErrorMessage } from "@/lib/web/error-utils";

export function useTodayAppointments(clinicId: string | null) {
	return useQuery(appointmentQueryOptions.today(clinicId ?? "", !!clinicId));
}

export function useAppointmentsInRange(
	clinicId: string | null,
	from: Date,
	to: Date,
	doctorId?: string
) {
	return useQuery(
		appointmentQueryOptions.inRange(
			{ clinicId: clinicId ?? "", from, to, doctorId },
			!!clinicId
		)
	);
}

export function useCreateAppointment() {
	const qc = useQueryClient();
	const mutation = useMutation({
		...appointmentMutationOptions.create(),
		onSuccess: () => {
			toast.success("Appointment scheduled");
			qc.invalidateQueries({ queryKey: appointmentQueryKeys.all });
		},
		onError: err =>
			toast.error("Scheduling failed", { description: getErrorMessage(err) })
	});
	return { create: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useUpdateAppointmentStatus() {
	const qc = useQueryClient();
	return useMutation({
		...appointmentMutationOptions.updateStatus(),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: appointmentQueryKeys.all });
		},
		onError: err =>
			toast.error("Update failed", { description: getErrorMessage(err) })
	});
}
