// apps/web/src/hooks/use-sidebar.ts

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'smart_clinic_sidebar_collapsed';
const DEFAULT_COLLAPSED = false;

// ── Module-level listener set ──────────────────────────────
// A single source of truth for all hook instances in this tab.
// We keep our own subscriber set so we don't rely on synthetic
// StorageEvents (which don't fire in the originating tab) and so
// programmatic writes via `setCollapsed` propagate immediately.

type Listener = () => void;

const listeners = new Set<Listener>();

const emit = () => {
  for (const l of listeners) {
    l();
  }
};

const readStored = (): boolean => {
  if (typeof window === 'undefined') {
    return DEFAULT_COLLAPSED;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    // localStorage can throw in private-mode / disabled-cookie contexts.
    return DEFAULT_COLLAPSED;
  }
};

const writeStored = (value: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Ignore quota / security errors — the in-memory listener
    // set still keeps same-tab instances in sync.
  }
};

// ── Cross-tab sync ─────────────────────────────────────────
// The `storage` event fires in *other* tabs (not the originating
// one), so this covers multi-tab drift. Same-tab updates go
// through `emit()` in `setCollapsed`.

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      emit();
    }
  });
}

// ── Public store API (usable outside React too) ────────────

const subscribe = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): boolean => readStored();

const getServerSnapshot = (): boolean => DEFAULT_COLLAPSED;

/**
 * Programmatically set the collapsed state. Updates every mounted
 * `useSidebar()` consumer in this tab and persists to localStorage
 * for cross-tab sync.
 */
export function setSidebarCollapsed(collapsed: boolean): void {
  const current = readStored();

  // No-op, avoid re-render
  if (current === collapsed) {
    return;
  }

  writeStored(collapsed);
  emit();
}

export function toggleSidebarCollapsed(): void {
  setSidebarCollapsed(!readStored());
}

// ── React hook ─────────────────────────────────────────────

export function useSidebar() {
  const collapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const toggle = useCallback(() => {
    toggleSidebarCollapsed();
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setSidebarCollapsed(value);
  }, []);

  const collapse = useCallback(() => {
    setSidebarCollapsed(true);
  }, []);

  const expand = useCallback(() => {
    setSidebarCollapsed(false);
  }, []);

  return { collapsed, toggle, setCollapsed, collapse, expand };
}
