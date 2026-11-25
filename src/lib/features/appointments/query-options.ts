import { mutationOptions, queryOptions } from "@tanstack/react-query";
import {
	createAppointmentFn,
	listRangeAppointmentsFn,
	listTodayClinicAppointmentsFn,
	transitionAppointmentStatusFn
} from "@/server/functions/appointments.functions";

export const appointmentQueryKeys = {
	all: ["appointments"] as const,
	today: (clinicId: string) =>
		[...appointmentQueryKeys.all, "today", clinicId] as const,
	inRange: (input?: {
		clinicId: string;
		from: Date;
		to: Date;
		doctorId?: string;
	}) => [...appointmentQueryKeys.all, "range", input] as const
};

export const appointmentQueryOptions = {
	today: (clinicId: string, enabled = true) =>
		queryOptions({
			queryKey: appointmentQueryKeys.today(clinicId),
			queryFn: () => listTodayClinicAppointmentsFn({ data: { clinicId } }),
			enabled: enabled && clinicId.length > 0,
			refetchInterval: 30_000
		}),
	inRange: (
		input: { clinicId: string; from: Date; to: Date; doctorId?: string },
		enabled = true
	) =>
		queryOptions({
			queryKey: appointmentQueryKeys.inRange(input),
			queryFn: () => listRangeAppointmentsFn({ data: input }),
			enabled: enabled && input.clinicId.length > 0
		})
};

export const appointmentMutationOptions = {
	create: () =>
		mutationOptions({
			mutationKey: ["appointments", "create"] as const,
			mutationFn: (input: Parameters<typeof createAppointmentFn>[0]["data"]) =>
				createAppointmentFn({ data: input })
		}),
	updateStatus: () =>
		mutationOptions({
			mutationKey: ["appointments", "status"] as const,
			mutationFn: (input: {
				id: string;
				status: "completed" | "cancelled" | "no-show";
			}) =>
				transitionAppointmentStatusFn({
					data: {
						id: input.id,
						action:
							input.status === "completed"
								? "complete"
								: input.status === "cancelled"
									? "cancel"
									: "no-show"
					}
				})
		})
};
