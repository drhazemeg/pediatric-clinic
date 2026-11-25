// apps/web/src/lib/app-mode.tsx
import type { ReactNode } from 'react';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type ClinicCareMode = 'outpatient' | 'lactation' | 'neonatal';

export type ClinicLocale = 'ar' | 'en';

interface AppModeContextValue {
  mode: ClinicCareMode;
  setMode: (mode: ClinicCareMode) => void;
  locale: ClinicLocale;
  setLocale: (locale: ClinicLocale) => void;
  toggleLocale: () => void;
}

const noop = (): void => undefined;

const AppModeContext = createContext<AppModeContextValue>({
  mode: 'outpatient',
  setMode: noop,
  locale: 'ar',
  setLocale: noop,
  toggleLocale: noop,
});

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ClinicCareMode>('outpatient');
  const [locale, setLocale] = useState<ClinicLocale>('ar');

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, locale, setLocale, toggleLocale }),
    [mode, locale, toggleLocale],
  );

  return (
    <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>
  );
}

export function useAppMode() {
  return useContext(AppModeContext);
}
