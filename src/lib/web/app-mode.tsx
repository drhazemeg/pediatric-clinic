// apps/web/src/lib/app-mode.tsx
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";

export type ClinicCareMode = "outpatient" | "lactation" | "neonatal";
export type ClinicLocale = "ar" | "en";

interface AppModeContextValue {
	mode: ClinicCareMode;
	setMode: (mode: ClinicCareMode) => void;
	locale: ClinicLocale;
	setLocale: (locale: ClinicLocale) => void;
	toggleLocale: () => void;
}

const AppModeContext = createContext<AppModeContextValue>({
	mode: "outpatient",
	setMode: () => {},
	locale: "ar",
	setLocale: () => {},
	toggleLocale: () => {}
});

export function AppModeProvider({ children }: { children: ReactNode }) {
	const [mode, setModeState] = useState<ClinicCareMode>("outpatient");
	const [locale, setLocaleState] = useState<ClinicLocale>("ar");

	const setMode = useCallback((nextMode: ClinicCareMode) => {
		setModeState(nextMode);
	}, []);

	const setLocale = useCallback((nextLocale: ClinicLocale) => {
		setLocaleState(nextLocale);
	}, []);

	const toggleLocale = useCallback(() => {
		setLocaleState(prev => (prev === "ar" ? "en" : "ar"));
	}, []);

	return (
		<AppModeContext.Provider
			value={{ mode, setMode, locale, setLocale, toggleLocale }}
		>
			{children}
		</AppModeContext.Provider>
	);
}

export function useAppMode() {
	return useContext(AppModeContext);
}
