// apps/web/src/components/analytics/ChartsBundle.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	BreakdownCharts,
	type CareDomainItem,
	type ClinicalCategoryItem,
	type EncounterFormatItem
} from "./BreakdownCharts";
import { type ClinicalTrendPoint, ScoreTrendChart } from "./ScoreTrendChart";
import { LastSyncedBadge } from "./shared";
import {
	type DomainTimeItem,
	TimeAnalyticsPanel,
	type TimeTrendItem,
	type VisitTypeTimeItem
} from "./TimeAnalyticsPanel";

interface ChartsBundleProps {
	trend: ClinicalTrendPoint[] | undefined;
	byCategory: ClinicalCategoryItem[] | undefined;
	byDomain: CareDomainItem[] | undefined;
	byFormat: EncounterFormatItem[] | undefined;
	domainTime: DomainTimeItem[] | undefined;
	visitTypeTime: VisitTypeTimeItem[] | undefined;
	timeTrend: TimeTrendItem[] | undefined;
	/** Timestamp (ms) from persisted TanStack Query cache (`query.dataUpdatedAt`) */
	dataUpdatedAt?: number;
}

export default function ChartsBundle({
	trend,
	byCategory,
	byDomain,
	byFormat,
	domainTime,
	visitTypeTime,
	timeTrend,
	dataUpdatedAt
}: ChartsBundleProps) {
	return (
		<Tabs
			className='w-full'
			defaultValue='trend'
		>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<TabsList className='h-12 justify-start gap-2 bg-transparent'>
					<TabsTrigger
						className='data-[active=true]:clay-shadow h-11 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] px-5 text-sm font-semibold text-[var(--warm-charcoal)] transition-all hover:bg-[var(--oat-light)] data-[active=true]:bg-[var(--clay-black)] data-[active=true]:text-[var(--pure-white)]'
						value='trend'
					>
						Adherence Trend
					</TabsTrigger>
					<TabsTrigger
						className='data-[active=true]:clay-shadow h-11 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] px-5 text-sm font-semibold text-[var(--warm-charcoal)] transition-all hover:bg-[var(--oat-light)] data-[active=true]:bg-[var(--clay-black)] data-[active=true]:text-[var(--pure-white)]'
						value='breakdown'
					>
						Clinical Breakdown
					</TabsTrigger>
					<TabsTrigger
						className='data-[active=true]:clay-shadow h-11 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] px-5 text-sm font-semibold text-[var(--warm-charcoal)] transition-all hover:bg-[var(--oat-light)] data-[active=true]:bg-[var(--clay-black)] data-[active=true]:text-[var(--pure-white)]'
						value='duration'
					>
						Consult Duration
					</TabsTrigger>
				</TabsList>

				<LastSyncedBadge dataUpdatedAt={dataUpdatedAt} />
			</div>

			<TabsContent
				className='pt-6'
				value='trend'
			>
				<ScoreTrendChart data={trend} />
			</TabsContent>

			<TabsContent
				className='pt-6'
				value='breakdown'
			>
				<BreakdownCharts
					byCategory={byCategory}
					byDomain={byDomain}
					byFormat={byFormat}
				/>
			</TabsContent>

			<TabsContent
				className='pt-6'
				value='duration'
			>
				<TimeAnalyticsPanel
					domainTime={domainTime}
					timeTrend={timeTrend}
					visitTypeTime={visitTypeTime}
				/>
			</TabsContent>
		</Tabs>
	);
}
