// apps/web/src/components/analytics/BreakdownCharts.tsx

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	BarChart,
	type ChartConfig,
	ChartContainer,
	type ChartDataPoint,
	ChartLegend
} from "@/components/ui/chart";
import { formatLabel, formatTime } from "@/utils/format";
import { CHART_COLORS, EmptyChartState } from "./shared";

export interface ClinicalCategoryItem {
	categoryId: string;
	categoryName: string;
	compliancePct: number;
	avgScorePct: number;
	/** Average encounter duration in seconds */
	avgDurationSec: number;
	encounters: number;
}

export interface CareDomainItem {
	domainId: string;
	domainName: string;
	compliancePct: number;
	avgScorePct: number;
	/** Average care-domain duration in seconds */
	avgDurationSec: number;
	encounters: number;
}

export interface EncounterFormatItem {
	format: string;
	compliancePct: number;
	/** Average duration per individual item in seconds (formatTime expects seconds) */
	avgDurationSec: number;
	/** Total number of items recorded for this format */
	totalItems: number;
}

interface BreakdownChartsProps {
	byCategory: ClinicalCategoryItem[] | undefined;
	byDomain: CareDomainItem[] | undefined;
	byFormat: EncounterFormatItem[] | undefined;
}

const COMPLIANCE_CHART_CONFIG: ChartConfig = {
	compliancePct: {
		label: "Protocol Adherence (%)",
		color: CHART_COLORS[0]
	}
};

function AdherenceBar({ pct }: { pct: number }) {
	return (
		<div className='h-2 w-full overflow-hidden rounded-full bg-[var(--oat-light)]'>
			<div
				className='h-full rounded-full transition-all'
				style={{
					width: `${pct}%`,
					backgroundColor:
						pct >= 80
							? "var(--matcha-600)"
							: pct >= 60
								? "var(--lemon-700)"
								: "var(--pomegranate-600)"
				}}
			/>
		</div>
	);
}

export function BreakdownCharts({
	byCategory,
	byDomain,
	byFormat
}: BreakdownChartsProps) {
	const categoryData = useMemo<ChartDataPoint[]>(
		() =>
			(byCategory ?? []).map(item => ({
				categoryName: item.categoryName,
				compliancePct: item.compliancePct,
				avgScorePct: item.avgScorePct
			})),
		[byCategory]
	);

	const domainData = useMemo<ChartDataPoint[]>(
		() =>
			(byDomain ?? []).map(item => ({
				domainName: item.domainName,
				compliancePct: item.compliancePct,
				avgScorePct: item.avgScorePct
			})),
		[byDomain]
	);

	return (
		<div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
			<Card className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardHeader>
					<CardTitle className='font-headline text-lg font-bold text-[var(--clay-black)]'>
						Performance by Clinical Category
					</CardTitle>
				</CardHeader>
				<CardContent>
					{categoryData.length > 0 ? (
						<>
							<ChartContainer
								config={COMPLIANCE_CHART_CONFIG}
								height={220}
							>
								<BarChart
									colors={[CHART_COLORS[0]]}
									data={categoryData}
									dataKeys={["compliancePct"]}
									height={220}
									xAxisKey='categoryName'
								/>
							</ChartContainer>
							<ChartLegend config={COMPLIANCE_CHART_CONFIG} />
						</>
					) : (
						<EmptyChartState message='No clinical category data available yet.' />
					)}
				</CardContent>
			</Card>

			<Card className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardHeader>
					<CardTitle className='font-headline text-lg font-bold text-[var(--clay-black)]'>
						Performance by Care Domain
					</CardTitle>
				</CardHeader>
				<CardContent>
					{domainData.length > 0 ? (
						<>
							<ChartContainer
								config={COMPLIANCE_CHART_CONFIG}
								height={220}
							>
								<BarChart
									colors={[CHART_COLORS[2]]}
									data={domainData}
									dataKeys={["compliancePct"]}
									height={220}
									xAxisKey='domainName'
								/>
							</ChartContainer>
							<ChartLegend config={COMPLIANCE_CHART_CONFIG} />
						</>
					) : (
						<EmptyChartState message='No care domain data available yet.' />
					)}
				</CardContent>
			</Card>

			<Card className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] lg:col-span-2'>
				<CardHeader>
					<CardTitle className='font-headline text-lg font-bold text-[var(--clay-black)]'>
						Performance by Assessment / Visit Format
					</CardTitle>
				</CardHeader>
				<CardContent>
					{byFormat && byFormat.length > 0 ? (
						<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
							{byFormat.map(item => (
								<div
									className='rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--warm-cream)] p-4'
									key={item.format}
								>
									<div className='mb-2 flex items-center justify-between'>
										<span className='text-sm font-semibold text-[var(--clay-black)]'>
											{formatLabel(item.format)}
										</span>
										<span className='text-xs text-[var(--warm-charcoal)]'>
											{item.totalItems} items
										</span>
									</div>
									<div className='mb-1 flex items-center gap-2'>
										<span className='text-lg font-bold text-[var(--clay-black)]'>
											{item.compliancePct}%
										</span>
										<span className='text-xs text-[var(--warm-charcoal)]'>
											{formatTime(item.avgDurationSec)} avg/item
										</span>
									</div>
									<AdherenceBar pct={item.compliancePct} />
								</div>
							))}
						</div>
					) : (
						<EmptyChartState message='No assessment format data available yet.' />
					)}
				</CardContent>
			</Card>
		</div>
	);
}
