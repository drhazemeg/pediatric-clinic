// src/components/providers/clinical-store-provider.tsx

import { type ReactNode, useEffect } from "react";
import { initializeClinicalStore } from "./clinical-store";

export function ClinicalStoreProvider({ children }: { children: ReactNode }) {
	useEffect(() => {
		initializeClinicalStore();
	}, []);

	return children;
}
