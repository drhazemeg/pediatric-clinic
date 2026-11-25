// apps/web/src/components/growth/GrowthPercentileChart.tsx
// WHO & Egyptian Anthropometric Growth Charts using @/components/ui/chart (@tanstack/charts)

import { useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import {
	AreaChart,
	type ChartConfig,
	ChartContainer,
	type ChartDataPoint,
	ChartLegend,
	LineChart
} from "@/components/ui/chart";

export interface GrowthCurvePoint {
	ageMonths: number;
	p3: number;
	p15: number;
	p50: number;
	p85: number;
	p97: number;
	childValue?: number;
}

interface GrowthPercentileChartProps {
	title: string;
	indicator:
		| "weight-for-age"
		| "length-for-age"
		| "head-circumference-for-age"
		| "bmi-for-age";
	standard?: "who" | "egypt";
	sex: "male" | "female";
	unit: string;
	curveData: GrowthCurvePoint[];
	childMeasurements?: {
		ageMonths: number;
		value: number;
		zScore?: number;
		date?: string;
	}[];
}

const PERCENTILE_BAND_CONFIG: ChartConfig = {
	p97: { label: "97th (+2 SD)", color: "#f59e0b" },
	p85: { label: "85th (+1 SD)", color: "#10b981" },
	p50: { label: "50th Median", color: "#059669" },
	p15: { label: "15th (-1 SD)", color: "#ef4444" },
	p3: { label: "3rd (-2 SD)", color: "#b91c1c" }
};

const BAND_KEYS = ["p97", "p85", "p50", "p15", "p3"];
const BAND_COLORS = ["#f59e0b", "#10b981", "#059669", "#ef4444", "#b91c1c"];

export function GrowthPercentileChart({
	title,
	standard = "who",
	sex,
	unit,
	curveData,
	childMeasurements = []
}: GrowthPercentileChartProps) {
	const bandData = useMemo<ChartDataPoint[]>(
		() =>
			curveData.map(pt => ({
				ageLabel: `${pt.ageMonths}m`,
				ageMonths: pt.ageMonths,
				p97: pt.p97,
				p85: pt.p85,
				p50: pt.p50,
				p15: pt.p15,
				p3: pt.p3
			})),
		[curveData]
	);

	const childPoints = useMemo<ChartDataPoint[]>(
		() =>
			[...childMeasurements]
				.sort((a, b) => a.ageMonths - b.ageMonths)
				.map(m => ({
					ageLabel: `${m.ageMonths.toFixed(1)}m`,
					childValue: m.value
				})),
		[childMeasurements]
	);

	const childConfig = useMemo<ChartConfig>(
		() => ({
			childValue: {
				label: `Child (${unit})`,
				color: "#047857"
			}
		}),
		[unit]
	);

	const sexLabel = sex === "male" ? "Boys (الأولاد)" : "Girls (البنات)";
	const standardLabel =
		standard === "who"
			? "WHO Child Growth Standards"
			: "Egyptian National Reference Curves";

	return (
		<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
			<CardHeader className='pb-2'>
				<div className='flex flex-wrap items-center justify-between gap-2'>
					<div>
						<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
							{title} ({unit})
						</CardTitle>
						<CardDescription className='text-xs'>
							{standardLabel} &bull; {sexLabel}
						</CardDescription>
					</div>
					<span className='text-xs font-semibold text-[var(--matcha-800)]'>
						Child Measurements (الطفل)
					</span>
				</div>
			</CardHeader>
			<CardContent className='space-y-4 pt-2'>
				<div>
					<p className='mb-1 text-xs font-semibold text-[var(--warm-charcoal)]'>
						Reference Percentile Bands ({unit})
					</p>
					<ChartContainer
						config={PERCENTILE_BAND_CONFIG}
						height={280}
					>
						<AreaChart
							colors={BAND_COLORS}
							data={bandData}
							dataKeys={BAND_KEYS}
							height={280}
							xAxisKey='ageLabel'
						/>
					</ChartContainer>
					<ChartLegend config={PERCENTILE_BAND_CONFIG} />
				</div>

				{childPoints.length > 0 && (
					<div className='border-t border-[var(--oat-border)] pt-3'>
						<p className='mb-1 text-xs font-semibold text-[var(--clay-black)]'>
							Recorded Child Measurements ({unit})
						</p>
						<ChartContainer
							config={childConfig}
							height={180}
						>
							<LineChart
								colors={["#047857"]}
								data={childPoints}
								dataKeys={["childValue"]}
								height={180}
								xAxisKey='ageLabel'
							/>
						</ChartContainer>
						<ChartLegend config={childConfig} />
					</div>
				)}
			</CardContent>
		</Card>
	);
}
