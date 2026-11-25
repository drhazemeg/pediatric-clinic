import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { MaterialIcon } from '@/components/ui/material-icon';
import { announcementQueryOptions } from '@/lib/features/announcements/query-options';

const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

const SEVERITY_CONFIG = {
  info: {
    accent: 'bg-[var(--slushie-500)]',
    icon: 'info',
    textColor: 'text-[var(--slushie-800)]',
  },
  warning: {
    accent: 'bg-[var(--lemon-500)]',
    icon: 'warning',
    textColor: 'text-[var(--lemon-800)]',
  },
  error: {
    accent: 'bg-[var(--pomegranate-400)]',
    icon: 'error',
    textColor: 'text-[var(--pomegranate-600)]',
  },
} as const;

function getAnnouncementStorageKey(message: string, severity: string): string {
  let hash = 0x811c9dc5;
  const input = `${severity}:${message}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `smart_clinic_announcement_${(hash >>> 0).toString(16)}`;
}

function readDismissedExpiry(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const expiry = Number(raw);
    return Number.isFinite(expiry) ? expiry : null;
  } catch {
    return null;
  }
}

function writeDismissedExpiry(key: string, expiry: number): void {
  try {
    window.localStorage.setItem(key, String(expiry));
  } catch {
    // Storage can be unavailable in private browsing contexts.
  }
}

function removeDismissedKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in private browsing contexts.
  }
}

export function AnnouncementBanner() {
  const { data } = useQuery(announcementQueryOptions.active());
  const [dismissed, setDismissed] = useState(false);

  const storageKey = data
    ? getAnnouncementStorageKey(data.message, data.severity)
    : null;

  useEffect(() => {
    if (!data || !storageKey) {
      setDismissed(false);
      return;
    }
    const expiry = readDismissedExpiry(storageKey);
    if (expiry !== null) {
      if (Date.now() < expiry) {
        setDismissed(true);
        return;
      }
      removeDismissedKey(storageKey);
    }
    setDismissed(false);
  }, [data, storageKey]);

  const handleDismiss = useCallback(() => {
    if (!data || !storageKey) return;
    writeDismissedExpiry(storageKey, Date.now() + DISMISS_TTL_MS);
    setDismissed(true);
  }, [data, storageKey]);

  if (dismissed || !data?.message) return null;

  const cfg = SEVERITY_CONFIG[data.severity];

  return (
    <section
      aria-label="Clinic announcement"
      aria-live="polite"
      className="sticky top-0 z-50 border-b-2 border-[var(--oat-border)] bg-[var(--warm-cream)] shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 md:px-6">
        <div className={`h-8 w-1 shrink-0 rounded-full ${cfg.accent}`} />
        <MaterialIcon
          className={`shrink-0 text-lg ${cfg.textColor}`}
          name={cfg.icon}
        />
        <p className={`flex-1 text-sm font-medium ${cfg.textColor}`}>
          {data.message}
        </p>
        <button
          aria-label="Dismiss announcement"
          className="shrink-0 cursor-pointer text-[var(--warm-charcoal)] transition-colors hover:text-[var(--clay-black)]"
          onClick={handleDismiss}
          type="button"
        >
          <MaterialIcon className="text-lg" name="close" />
        </button>
      </div>
    </section>
  );
}
