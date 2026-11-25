// apps/web/src/hooks/use-outbox-sync.ts
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
	clinicalActions,
	clinicalStore,
	useClinicStore as useClinicalStore
} from "#/integrations/tanstack-store/clinical-store.ts";
import { replayOfflineMutation } from "@/lib/features/offline/query-options";
import { getErrorMessage } from "@/lib/web/error-utils";

const MAX_RETRIES = 3;

export function useOutboxSync() {
	const qc = useQueryClient();
	const outbox = useClinicalStore(s => s.outbox);
	const isFlushingRef = useRef(false);

	const flushOutbox = useCallback(async () => {
		if (isFlushingRef.current) return;
		if (typeof navigator !== "undefined" && !navigator.onLine) return;

		const pending = clinicalStore.state.outbox.filter(
			m => m.retryCount < MAX_RETRIES
		);
		if (pending.length === 0) return;

		isFlushingRef.current = true;
		let syncedCount = 0;

		try {
			for (const item of pending) {
				try {
					await replayOfflineMutation(item, qc);
					clinicalActions.markMutationSynced(item.id);
					syncedCount++;
				} catch (err) {
					clinicalActions.markMutationFailed(item.id, getErrorMessage(err));
				}
			}

			if (syncedCount > 0) {
				toast.success(
					`Synced ${syncedCount} offline clinic update${syncedCount > 1 ? "s" : ""}`
				);
			}
		} finally {
			isFlushingRef.current = false;
		}
	}, [qc]);

	useEffect(() => {
		void flushOutbox();

		const onOnline = () => void flushOutbox();
		window.addEventListener("online", onOnline);
		const timer = setInterval(() => void flushOutbox(), 15_000);

		return () => {
			window.removeEventListener("online", onOnline);
			clearInterval(timer);
		};
	}, [flushOutbox]);

	return {
		pendingCount: outbox.length,
		flushOutbox
	};
}
