// apps/web/src/hooks/use-active-clinic.ts

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useActiveClinicName } from "./use-clinic-store";

export const DEFAULT_HURGHADA_CLINIC_ID = "clinic_hurghada_pediatrics";

export function useActiveClinic() {
	const { data: session, isPending } = authClient.useSession();
	const user = session?.user as
		| { id: string; name?: string; role?: string; clinicId?: string }
		| undefined;
	const clinicId = user?.clinicId || DEFAULT_HURGHADA_CLINIC_ID;
	const clinicName = useActiveClinicName();
	return {
		session,
		user,
		clinicId,
		clinicName,
		isPending
	};
}

export function useActiveClinicId(): string {
	const { clinicId } = useActiveClinic();
	return clinicId;
}

export function useHydrateActiveClinic(
	seed: { clinicId: string; clinicName: string } | null
) {
	useEffect(() => {
		if (seed?.clinicId) {
			// Import is lazy to avoid a cycle if clinicActions imports this hook
			import("@/integrations/tanstack-store/clinical-store").then(
				({ clinicalActions }) => {
					clinicalActions.setActiveClinic({
						id: seed.clinicId,
						name: seed.clinicName
					});
				}
			);
		}
	}, [seed?.clinicId, seed?.clinicName]);
}
