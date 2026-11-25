// apps/web/src/components/analytics/shared.tsx

import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { MaterialIcon } from '@/components/ui/material-icon';

export const CHART_COLORS = [
  'var(--matcha-600)',
  'var(--slushie-600)',
  'var(--lemon-700)',
  'var(--ube-600)',
  'var(--pomegranate-600)',
] as const;

/** Read-only analytics queries stay fresh in cache so offline clinic views render cached data. */
export const ANALYTICS_QUERY_OPTIONS = {
  staleTime: Number.POSITIVE_INFINITY,
} as const;

export const formatShortDate = (dateStr: string): string => {
  const d = new Date(dateStr);

  if (Number.isNaN(d.getTime())) {
    return dateStr;
  }

  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export const EmptyChartState = ({
  message,
  ctaLabel = 'Open Patient Directory',
  to = '/patients',
  heightClass = 'h-48',
}: {
  message: string;
  ctaLabel?: string;
  to?: '/patients' | '/queue';
  heightClass?: string;
}) => (
  <div
    className={`flex ${heightClass} flex-col items-center justify-center text-muted-foreground`}
  >
    <p className="text-sm font-semibold text-foreground">{message}</p>
    <Link
      className="mt-3 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90"
      to={to}
    >
      {ctaLabel}
    </Link>
  </div>
);

export const LastSyncedBadge = ({
  dataUpdatedAt,
}: {
  dataUpdatedAt?: number;
}) => {
  const formatted = useMemo(() => {
    if (dataUpdatedAt === undefined || dataUpdatedAt <= 0) {
      return null;
    }

    return new Date(dataUpdatedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [dataUpdatedAt]);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
      <span className="inline-flex text-sm text-primary">
        <MaterialIcon name="cloud_done" />
      </span>
      <span>
        {formatted === null
          ? 'Last synced: Cached'
          : `Last synced: ${formatted}`}
      </span>
    </span>
  );
};
