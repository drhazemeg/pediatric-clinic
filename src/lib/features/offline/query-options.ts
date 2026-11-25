import type { QueryClient } from "@tanstack/react-query";
import type { OfflineMutationItem } from "#/integrations/tanstack-store/clinical-store.ts";
import { addVisitMeasurementWithZScoreFn } from "@/server/functions/growth-and-development.functions";
import {
	createPatientFn,
	updatePatientFn
} from "@/server/functions/patients.functions";
import { createPrescriptionRecordFn } from "@/server/functions/prescriptions.functions";
import {
	enqueueClinicPatientFn,
	updateQueueEntryStatusFn
} from "@/server/functions/queue.functions";
import {
	createVisitFn,
	updateVisitFn
} from "@/server/functions/visits.functions";
import { patientQueryKeys } from "../patients/queries.options";
import { prescriptionQueryKeys } from "../prescriptions/query-options";
import { visitQueryKeys } from "../visits/query-options";

export async function replayOfflineMutation(
	item: OfflineMutationItem,
	queryClient: QueryClient
) {
	switch (item.entityType) {
		case "visit":
			if (item.action === "create") {
				await createVisitFn({
					data: item.payload as Parameters<typeof createVisitFn>[0]["data"]
				});
			} else if (item.action === "update") {
				await updateVisitFn({
					data: item.payload as Parameters<typeof updateVisitFn>[0]["data"]
				});
			} else {
				throw new Error("Offline visit deletion is not supported");
			}
			await queryClient.invalidateQueries({ queryKey: visitQueryKeys.all });
			return;
		case "patient":
			if (item.action === "create") {
				await createPatientFn({
					data: item.payload as Parameters<typeof createPatientFn>[0]["data"]
				});
			} else if (item.action === "update") {
				await updatePatientFn({
					data: item.payload as Parameters<typeof updatePatientFn>[0]["data"]
				});
			} else {
				throw new Error("Offline patient deletion is not supported");
			}
			await queryClient.invalidateQueries({
				queryKey: patientQueryKeys.lists()
			});
			return;
		case "queue":
			if (item.action === "create") {
				await enqueueClinicPatientFn({
					data: item.payload as Parameters<
						typeof enqueueClinicPatientFn
					>[0]["data"]
				});
			} else if (item.action === "update") {
				await updateQueueEntryStatusFn({
					data: item.payload as Parameters<
						typeof updateQueueEntryStatusFn
					>[0]["data"]
				});
			} else {
				throw new Error("Offline queue deletion is not supported");
			}
			await queryClient.invalidateQueries({ queryKey: ["queue"] });
			return;
		case "prescription":
			if (item.action !== "create") {
				throw new Error("Only prescription creation can be replayed offline");
			}
			await createPrescriptionRecordFn({
				data: item.payload as Parameters<
					typeof createPrescriptionRecordFn
				>[0]["data"]
			});
			await queryClient.invalidateQueries({
				queryKey: prescriptionQueryKeys.all
			});
			return;
		case "vitals":
			if (item.action !== "create") {
				throw new Error("Only vitals creation can be replayed offline");
			}
			await addVisitMeasurementWithZScoreFn({
				data: item.payload as Parameters<
					typeof addVisitMeasurementWithZScoreFn
				>[0]["data"]
			});
			await queryClient.invalidateQueries({ queryKey: ["growth"] });
			return;
		default: {
			const unsupported: never = item.entityType;
			throw new Error(`Unsupported offline mutation type: ${unsupported}`);
		}
	}
}
