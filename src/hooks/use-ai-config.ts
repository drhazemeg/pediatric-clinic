// apps/web/src/hooks/use-ai-config.ts

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	settingsMutationOptions,
	settingsQueryOptions
} from "@/lib/features/settings/query-options";
import { getErrorMessage } from "@/lib/web/error-utils";

/**
 * Reads the user's AI configuration (platform default vs BYOK).
 * Only exposes masked keys — real keys never leave the server.
 */
export function useAiConfig() {
	const query = useQuery(settingsQueryOptions.aiConfig());

	const update = useMutation({
		...settingsMutationOptions.updateAiConfig(),
		onSuccess: () => {
			toast.success("AI settings saved");
			query.refetch();
		},
		onError: err =>
			toast.error("Failed to save", { description: getErrorMessage(err) })
	});

	return {
		config: query.data,
		isLoading: query.isLoading,
		update: update.mutateAsync,
		isSaving: update.isPending
	};
}

/** Credit balance + pool usage. Used in header chip and settings. */
export function useCredit() {
	const query = useQuery(settingsQueryOptions.credit());
	return {
		credit: query.data,
		isLoading: query.isLoading,
		refetch: query.refetch
	};
}
