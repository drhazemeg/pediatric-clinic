import { mutationOptions } from "@tanstack/react-query";
import {
	createPatientFn,
	linkGuardianFn,
	softDeletePatientFn,
	unlinkGuardianFn,
	updatePatientFn
} from "#/server/functions/patients.functions.ts";

export {
	growthReferenceCurvesQueryOptions,
	patientByMrnQueryOptions,
	patientDetailQueryOptions,
	patientGrowthSeriesQueryOptions,
	patientQueryKeys,
	patientsListQueryOptions
} from "./queries.options";

export const patientMutationOptions = {
	create: () =>
		mutationOptions({
			mutationKey: ["patients", "create"] as const,
			mutationFn: (input: Parameters<typeof createPatientFn>[0]["data"]) =>
				createPatientFn({ data: input })
		}),
	update: () =>
		mutationOptions({
			mutationKey: ["patients", "update"] as const,
			mutationFn: (input: Parameters<typeof updatePatientFn>[0]["data"]) =>
				updatePatientFn({ data: input })
		}),
	archive: () =>
		mutationOptions({
			mutationKey: ["patients", "archive"] as const,
			mutationFn: (input: Parameters<typeof softDeletePatientFn>[0]["data"]) =>
				softDeletePatientFn({ data: input })
		}),
	linkGuardian: () =>
		mutationOptions({
			mutationKey: ["patients", "guardian", "link"] as const,
			mutationFn: (input: Parameters<typeof linkGuardianFn>[0]["data"]) =>
				linkGuardianFn({ data: input })
		}),
	unlinkGuardian: () =>
		mutationOptions({
			mutationKey: ["patients", "guardian", "unlink"] as const,
			mutationFn: (input: Parameters<typeof unlinkGuardianFn>[0]["data"]) =>
				unlinkGuardianFn({ data: input })
		})
};
