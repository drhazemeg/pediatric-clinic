// src/features/patients/mutations.options.ts
import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPrescriptionRecordFn } from "#/server/functions/prescriptions.functions.ts";
import { createPrescriptionInputSchema } from "../prescriptions/schemas";
import { patientQueryKeys } from "./queries.options";

const addGrowthMeasurementInputSchema = z.object({
	patientId: z.string().min(1),
	visitId: z.string().min(1),
	indicator: z.enum([
		"weight-for-age",
		"length-for-age",
		"weight-for-length",
		"bmi-for-age",
		"head-circumference-for-age"
	]),
	value: z.number().positive(),
	sex: z.enum(["male", "female"]),
	ageMonths: z.number().min(0),
	lengthCm: z.number().positive().optional(),
	// Optional patient weight update for weight-based pediatric dosing accuracy.
	updatePatientWeightKg: z.number().positive().max(250).optional()
});

export const addGrowthMeasurementFn = createServerFn({ method: "POST" })
	.validator(addGrowthMeasurementInputSchema)
	.handler(async ({ data }) => {
		const parsed = addGrowthMeasurementInputSchema.parse(data);
		const { addMeasurementWithZScore } = await import(
			"@/db/queries/measurements.queries"
		);
		const { db, eq, patients } = await import("@/db");

		const measurement = await addMeasurementWithZScore(
			parsed.visitId,
			parsed.indicator,
			parsed.value,
			parsed.sex,
			parsed.ageMonths,
			parsed.lengthCm
		);

		if (parsed.updatePatientWeightKg !== undefined) {
			await db
				.update(patients)
				.set({
					weightKg: parsed.updatePatientWeightKg,
					updatedAt: new Date()
				})
				.where(eq(patients.id, parsed.patientId));
		}

		return measurement;
	});

export function addGrowthMeasurementMutationOptions(queryClient: QueryClient) {
	type Input = z.infer<typeof addGrowthMeasurementInputSchema>;
	type PatientDetail = {
		id: string;
		weightKg: number | null;
		[key: string]: unknown;
	};

	return mutationOptions({
		mutationKey: ["patients", "measurement", "add"] as const,
		mutationFn: async (input: Input) => {
			const validated = addGrowthMeasurementInputSchema.parse(input);
			return addGrowthMeasurementFn({ data: validated });
		},
		onMutate: async variables => {
			await queryClient.cancelQueries({
				queryKey: patientQueryKeys.detail(variables.patientId)
			});

			const previousPatient = queryClient.getQueryData<PatientDetail>(
				patientQueryKeys.detail(variables.patientId)
			);

			if (previousPatient && variables.updatePatientWeightKg !== undefined) {
				queryClient.setQueryData<PatientDetail>(
					patientQueryKeys.detail(variables.patientId),
					{
						...previousPatient,
						weightKg: variables.updatePatientWeightKg
					}
				);
			}

			return { previousPatient };
		},
		onError: (_err, variables, context) => {
			if (context?.previousPatient) {
				queryClient.setQueryData(
					patientQueryKeys.detail(variables.patientId),
					context.previousPatient
				);
			}
		},
		onSettled: async (_data, _err, variables) => {
			// Reconcile server-computed Z-scores, percentiles, and patient weight.
			if (variables.indicator !== "head-circumference-for-age") {
				await queryClient.invalidateQueries({
					queryKey: patientQueryKeys.growthSeries(
						variables.patientId,
						variables.indicator
					)
				});
			}
			await queryClient.invalidateQueries({
				queryKey: patientQueryKeys.growth(variables.patientId)
			});
			await queryClient.invalidateQueries({
				queryKey: patientQueryKeys.detail(variables.patientId)
			});
			await queryClient.invalidateQueries({
				queryKey: patientQueryKeys.lists()
			});
		}
	});
}

export function createPrescriptionMutationOptions(queryClient: QueryClient) {
	type Input = z.infer<typeof createPrescriptionInputSchema>;

	return mutationOptions({
		mutationKey: ["patients", "prescription", "create"] as const,
		mutationFn: async (input: Input) => {
			const validated = createPrescriptionInputSchema.parse(input);
			return createPrescriptionRecordFn({ data: validated });
		},
		onSuccess: async (_created, variables) => {
			await queryClient.invalidateQueries({
				queryKey: ["prescriptions", variables.patientId]
			});
			await queryClient.invalidateQueries({
				queryKey: ["visits", variables.visitId]
			});
			await queryClient.invalidateQueries({
				queryKey: patientQueryKeys.detail(variables.patientId)
			});
		}
	});
}
