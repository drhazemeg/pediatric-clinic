// src/lib/shadcn/theme.tsx

import type { ResolvedTheme, Theme } from './theme-context';

import { ScriptOnce } from '@tanstack/react-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import { ThemeContext } from './theme-context';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  getThemeScript,
  isTheme,
  readStoredTheme,
  resolveTheme,
  writeStoredTheme,
} from './theme-utils';

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

// `useSyncExternalStore` is the SSR-safe way to read "am I on the
// server?". `getServerSnapshot` returns `true` during SSR and
// `false` on the client. Unlike `typeof window !== "undefined"`,
// this is stable across the hydration boundary and won't trigger a
// hydration mismatch warning.
const emptySubscribe = () => () => {
  /* empty */
};

const getServerSnapshot = () => true;
const getClientSnapshot = () => false;

/**
 * The single `<ThemeProvider />` in the app.
 *
 * Provides the **same** `ThemeContext` that `hooks/use-theme.ts` reads.
 * Injects the SSR script so the first paint matches the resolved
 * theme, and keeps `<html class>` in sync with the persisted choice.
 *
 * `ScriptOnce` is only meaningful during SSR — it emits a `<script>`
 * tag into the server-rendered `<head>`. On the client, and in any
 * non-router tree (tests, isolated stories), it calls `useRouter()`
 * and crashes because there's no router above it. We gate it on the
 * environment so the SSR injection still happens and the client path
 * stays router-free.
 */
export const ThemeProvider = ({
  children,
  defaultTheme = 'system',
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) => {
  const isServer = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Hydrate the persisted theme on mount. Reading storage during
  // render would be a hydration mismatch — this effect runs after
  // SSR markup is committed.
  useEffect(() => {
    // Read the persisted choice after mount so the first client render stays
    // consistent with the SSR output and avoids a hydration mismatch.
    // oxlint-disable-next-line react/set-state-in-effect -- this sync is intentionally tied to client mount and storage hydration.
    setTheme(readStoredTheme(storageKey));
    setMounted(true);
  }, [storageKey]);

  // Apply the theme to <html> once mounted, and on every change.
  useEffect(() => {
    if (!mounted) {
      return;
    }

    applyTheme(theme);
  }, [theme, mounted]);

  // When the user follows the system, listen for OS-level changes
  // and re-apply. `resolveTheme` centralises the mapping so this
  // file can't disagree with the inline init script (theme-init.ts).
  useEffect(() => {
    if (!mounted || theme !== 'system') {
      return () => {
        /* empty */
      };
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(resolveTheme('system'));

    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, [theme, mounted]);

  // Cross-tab sync — the test file exercises this via `StorageEvent`.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return;
      }

      const nextTheme = isTheme(event.newValue)
        ? event.newValue
        : readStoredTheme(storageKey);

      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  const setThemeState = useCallback(
    (next: Theme) => {
      writeStoredTheme(next, storageKey);
      setTheme(next);
    },
    [storageKey],
  );

  // `mounted` gating: the very first client render must agree with
  // SSR to avoid a hydration warning on any `useTheme()` consumer
  // that isn't inside `<html suppressHydrationWarning>`. Until
  // `mounted` flips, report the SSR value ("light") regardless of
  // the live matchMedia state. Once mounted, resolve for real.
  const resolvedTheme: ResolvedTheme = mounted ? resolveTheme(theme) : 'light';

  const toggleTheme = useCallback(() => {
    setThemeState(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setThemeState]);

  // Keyboard shortcut: toggle theme with "d", but not while typing or with a modifier
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'd') {
        return;
      }

      if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const { target } = event;

      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      toggleTheme();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  const contextValue = useMemo(
    () => ({ theme, resolvedTheme, setTheme: setThemeState, toggleTheme }),
    [theme, resolvedTheme, setThemeState, toggleTheme],
  );

  return (
    <ThemeContext value={contextValue}>
      {isServer && (
        <ScriptOnce>{getThemeScript(storageKey, defaultTheme)}</ScriptOnce>
      )}
      {children}
    </ThemeContext>
  );
};
