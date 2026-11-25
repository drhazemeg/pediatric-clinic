// apps/web/src/components/analytics/ScoreTrendChart.tsx

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	AreaChart,
	type ChartConfig,
	ChartContainer,
	type ChartDataPoint,
	ChartLegend
} from "@/components/ui/chart";
import { CHART_COLORS, EmptyChartState, formatShortDate } from "./shared";

export interface ClinicalTrendPoint {
	date: string;
	visits: number;
	adherencePct: number;
}

interface ScoreTrendChartProps {
	data: ClinicalTrendPoint[] | undefined;
}

const ADHERENCE_CHART_CONFIG: ChartConfig = {
	adherencePct: {
		label: "Adherence Rate (%)",
		color: CHART_COLORS[0]
	}
};

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
	const chartData = useMemo<ChartDataPoint[]>(
		() =>
			(data ?? []).map(d => ({
				...d,
				label: formatShortDate(d.date)
			})),
		[data]
	);

	const latestPoint = data && data.length > 0 ? data[data.length - 1] : null;
	const latestRaw = latestPoint?.adherencePct ?? null;

	const statusLabel = useMemo(() => {
		if (latestRaw === null) return null;
		if (latestRaw >= 85) return "Optimal";
		if (latestRaw >= 70) return "On Track";
		return "Needs Review";
	}, [latestRaw]);

	if (!data || data.length === 0) {
		return (
			<Card className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardHeader>
					<CardTitle className='font-headline text-lg font-bold text-[var(--clay-black)]'>
						Clinical Adherence Trend
					</CardTitle>
				</CardHeader>
				<CardContent>
					<EmptyChartState
						ctaLabel='Open Clinic Queue'
						heightClass='h-64'
						message='Complete patient encounters to track protocol adherence over time.'
						to='/queue'
					/>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'>
			<CardHeader>
				<CardTitle className='font-headline text-lg font-bold text-[var(--clay-black)]'>
					Clinical Adherence Trend (30 Days)
				</CardTitle>
				{statusLabel && latestRaw !== null && (
					<span className='mt-0.5 text-sm text-[var(--warm-charcoal)]'>
						Latest: {latestRaw}% — {statusLabel}
					</span>
				)}
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={ADHERENCE_CHART_CONFIG}
					height={256}
				>
					<AreaChart
						colors={[CHART_COLORS[0]]}
						data={chartData}
						dataKeys={["adherencePct"]}
						height={256}
						xAxisKey='label'
					/>
				</ChartContainer>
				<ChartLegend config={ADHERENCE_CHART_CONFIG} />
			</CardContent>
		</Card>
	);
}
