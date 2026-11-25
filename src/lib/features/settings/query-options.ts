import { mutationOptions, queryOptions } from "@tanstack/react-query";
import {
	getAiConfigFn,
	getCreditFn,
	updateAiConfigFn
} from "@/server/functions/settings.functions";

export const settingsQueryKeys = {
	all: ["settings"] as const,
	aiConfig: () => [...settingsQueryKeys.all, "ai-config"] as const,
	credit: () => [...settingsQueryKeys.all, "credit"] as const
};

export const settingsQueryOptions = {
	aiConfig: () =>
		queryOptions({
			queryKey: settingsQueryKeys.aiConfig(),
			queryFn: () => getAiConfigFn()
		}),
	credit: () =>
		queryOptions({
			queryKey: settingsQueryKeys.credit(),
			queryFn: () => getCreditFn()
		})
};

export const settingsMutationOptions = {
	updateAiConfig: () =>
		mutationOptions({
			mutationKey: ["settings", "ai-config", "update"] as const,
			mutationFn: (input: Parameters<typeof updateAiConfigFn>[0]["data"]) =>
				updateAiConfigFn({ data: input })
		})
};
