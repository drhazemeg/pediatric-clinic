// apps/web/src/components/analytics/shared.tsx

import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export const CHART_COLORS = [
	"var(--matcha-600)",
	"var(--slushie-600)",
	"var(--lemon-700)",
	"var(--ube-600)",
	"var(--pomegranate-600)"
] as const;

/** Read-only analytics queries stay fresh in cache so offline clinic views render cached data. */
export const ANALYTICS_QUERY_OPTIONS = {
	staleTime: Number.POSITIVE_INFINITY
} as const;

export function formatShortDate(dateStr: string): string {
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return dateStr;
	return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function EmptyChartState({
	message,
	ctaLabel = "Open Patient Directory",
	to = "/patients",
	heightClass = "h-48"
}: {
	message: string;
	ctaLabel?: string;
	to?: "/patients" | "/queue";
	heightClass?: string;
}) {
	return (
		<div
			className={`flex ${heightClass} flex-col items-center justify-center text-[var(--warm-charcoal)]`}
		>
			<p className='text-sm font-semibold'>{message}</p>
			<Link
				className='clay-hover mt-3 rounded-[var(--radius-lg)] bg-[var(--clay-black)] px-3 py-1.5 text-xs font-semibold text-[var(--pure-white)] transition-all hover:bg-[var(--warm-charcoal)]'
				to={to}
			>
				{ctaLabel}
			</Link>
		</div>
	);
}

export function LastSyncedBadge({ dataUpdatedAt }: { dataUpdatedAt?: number }) {
	const formatted = useMemo(() => {
		if (!dataUpdatedAt || dataUpdatedAt <= 0) return null;
		return new Date(dataUpdatedAt).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit"
		});
	}, [dataUpdatedAt]);

	return (
		<span className='inline-flex items-center gap-1.5 rounded-full border border-[var(--oat-border)] bg-[var(--pure-white)] px-3 py-1 text-xs font-medium text-[var(--warm-charcoal)]'>
			<MaterialIcon
				className='text-sm text-[var(--matcha-600)]'
				name='cloud_done'
			/>
			<span>
				{formatted ? `Last synced: ${formatted}` : "Last synced: Cached"}
			</span>
		</span>
	);
}
