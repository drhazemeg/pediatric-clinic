// apps/web/src/components/analytics/TimeAnalyticsPanel.tsx

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
import { CHART_COLORS, EmptyChartState, formatShortDate } from "./shared";

export interface DomainTimeItem {
	domainName: string;
	avgTimeSpentSec: number;
	totalTimeSpentSec: number;
}

export interface VisitTypeTimeItem {
	visitType: string;
	avgTimeSpentSec: number;
	totalTimeSpentSec: number;
}

export interface TimeTrendItem {
	date: string;
	avgTimeSpentSec: number;
}

interface TimeAnalyticsPanelProps {
	domainTime: DomainTimeItem[] | undefined;
	visitTypeTime: VisitTypeTimeItem[] | undefined;
	timeTrend: TimeTrendItem[] | undefined;
}

const TIME_TREND_CHART_CONFIG: ChartConfig = {
	avgTimeSpentSec: {
		label: "Avg Consult Duration (sec)",
		color: CHART_COLORS[1]
	}
};

export function TimeAnalyticsPanel({
	domainTime,
	visitTypeTime,
	timeTrend
}: TimeAnalyticsPanelProps) {
	const trendChartData = useMemo<ChartDataPoint[]>(
		() =>
			(timeTrend ?? []).map(item => ({
				date: item.date,
				label: formatShortDate(item.date),
				avgTimeSpentSec: item.avgTimeSpentSec
			})),
		[timeTrend]
	);

	return (
		<div className='space-y-6'>
			<Card className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardHeader>
					<CardTitle className='font-headline text-lg font-bold text-[var(--clay-black)]'>
						Consultation Time by Care Domain
					</CardTitle>
				</CardHeader>
				<CardContent>
					{domainTime && domainTime.length > 0 ? (
						<div className='space-y-3'>
							{domainTime.map(item => (
								<div
									className='flex items-center gap-4'
									key={item.domainName}
								>
									<div className='w-36 shrink-0 truncate text-sm font-medium text-[var(--clay-black)]'>
										{item.domainName}
									</div>
									<div className='flex-1'>
										<div className='h-2.5 w-full overflow-hidden rounded-full bg-[var(--oat-light)]'>
											<div
												className='h-full rounded-full bg-[var(--slushie-600)]'
												style={{
													width: `${Math.min(100, (item.avgTimeSpentSec / 1800) * 100)}%`
												}}
											/>
										</div>
									</div>
									<div className='w-24 shrink-0 text-right text-sm text-[var(--warm-charcoal)]'>
										{formatTime(item.avgTimeSpentSec)}
									</div>
								</div>
							))}
						</div>
					) : (
						<EmptyChartState
							ctaLabel='Open Clinic Queue'
							heightClass='h-40'
							message='No consultation duration data by care domain yet.'
							to='/queue'
						/>
					)}
				</CardContent>
			</Card>

			<Card className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardHeader>
					<CardTitle className='font-headline text-lg font-bold text-[var(--clay-black)]'>
						Duration by Visit Type
					</CardTitle>
				</CardHeader>
				<CardContent>
					{visitTypeTime && visitTypeTime.length > 0 ? (
						<div className='space-y-3'>
							{visitTypeTime.map(item => (
								<div
									className='flex items-center gap-4'
									key={item.visitType}
								>
									<div className='w-36 shrink-0 truncate text-sm font-medium text-[var(--clay-black)]'>
										{formatLabel(item.visitType)}
									</div>
									<div className='flex-1'>
										<div className='h-2.5 w-full overflow-hidden rounded-full bg-[var(--oat-light)]'>
											<div
												className='h-full rounded-full bg-[var(--ube-600)]'
												style={{
													width: `${Math.min(100, (item.avgTimeSpentSec / 1800) * 100)}%`
												}}
											/>
										</div>
									</div>
									<div className='w-24 shrink-0 text-right text-sm text-[var(--warm-charcoal)]'>
										{formatTime(item.avgTimeSpentSec)}
									</div>
								</div>
							))}
						</div>
					) : (
						<EmptyChartState
							ctaLabel='Open Clinic Queue'
							heightClass='h-40'
							message='No duration data by visit type yet.'
							to='/queue'
						/>
					)}
				</CardContent>
			</Card>

			<Card className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardHeader>
					<CardTitle className='font-headline text-lg font-bold text-[var(--clay-black)]'>
						Daily Average Consultation Time
					</CardTitle>
				</CardHeader>
				<CardContent>
					{trendChartData.length > 0 ? (
						<>
							<ChartContainer
								config={TIME_TREND_CHART_CONFIG}
								height={200}
							>
								<BarChart
									colors={[CHART_COLORS[1]]}
									data={trendChartData}
									dataKeys={["avgTimeSpentSec"]}
									height={200}
									xAxisKey='label'
								/>
							</ChartContainer>
							<ChartLegend config={TIME_TREND_CHART_CONFIG} />
						</>
					) : (
						<EmptyChartState
							ctaLabel='Open Clinic Queue'
							heightClass='h-40'
							message='No daily consultation trend data yet.'
							to='/queue'
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
