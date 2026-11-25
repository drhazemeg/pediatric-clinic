// apps/web/src/components/finance/FinanceCashFlowChart.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	AreaChart,
	BarChart,
	type ChartConfig,
	ChartContainer,
	ChartLegend
} from "@/components/ui/chart";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyPoint {
	date: string;
	revenue: number;
	expense: number;
	net: number;
}

interface Props {
	data: DailyPoint[];
	isLoading: boolean;
	mode: "both" | "revenue" | "expense" | "net";
	title?: string;
}

const CHART_CONFIG: ChartConfig = {
	Revenue: { label: "Revenue (الإيرادات)", color: "#059669" },
	Expenses: { label: "Expenses (المصروفات)", color: "#dc2626" },
	Net: { label: "Net Cash (صافي الدخل)", color: "#2563eb" }
};

function formatPoints(points: DailyPoint[]) {
	return points.map(p => {
		// Format "YYYY-MM-DD" into short readable label e.g. "Nov 24"
		const parts = p.date.split("-");
		const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : p.date;
		return {
			month: label,
			dateFull: p.date,
			Revenue: Math.round(p.revenue / 100),
			Expenses: Math.round(p.expense / 100),
			Net: Math.round(p.net / 100)
		};
	});
}

export function FinanceCashFlowChart({ data, isLoading, mode, title }: Props) {
	const [chartType, setChartType] = useState<"area" | "bar">("area");

	if (isLoading) {
		return <Skeleton className='h-64 w-full rounded-xl' />;
	}

	if (data.length === 0) {
		return (
			<div className='flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--oat-border)] p-6 text-center text-sm text-[var(--warm-charcoal)]/60'>
				<MaterialIcon
					className='mb-2 text-3xl text-[var(--warm-charcoal)]/40'
					name='query_stats'
				/>
				<p className='font-semibold text-[var(--clay-black)]'>
					No financial transactions in this period
				</p>
				<p className='mt-1 text-xs'>
					Record revenue or expenses to view cash flow trends
				</p>
			</div>
		);
	}

	const transformed = formatPoints(data);

	const dataKeys =
		mode === "revenue"
			? ["Revenue"]
			: mode === "expense"
				? ["Expenses"]
				: mode === "net"
					? ["Net"]
					: ["Revenue", "Expenses"];

	const colors =
		mode === "revenue"
			? ["#059669"]
			: mode === "expense"
				? ["#dc2626"]
				: mode === "net"
					? ["#2563eb"]
					: ["#059669", "#dc2626"];

	const legendConfig: ChartConfig = Object.fromEntries(
		dataKeys.map((k, i) => [
			k,
			{ label: CHART_CONFIG[k]?.label ?? k, color: colors[i] ?? "#6b7280" }
		])
	);

	return (
		<div className='space-y-3'>
			<div className='flex items-center justify-between'>
				{title && (
					<h3 className='text-sm font-bold text-[var(--clay-black)]'>
						{title}
					</h3>
				)}
				<div className='ms-auto flex items-center gap-1 rounded-lg border border-[var(--oat-border)] bg-[var(--pure-white)] p-0.5'>
					<Button
						className={`h-7 px-2 text-xs ${
							chartType === "area"
								? "bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]"
								: "text-[var(--warm-charcoal)]"
						}`}
						onClick={() => setChartType("area")}
						size='sm'
						type='button'
						variant={chartType === "area" ? "default" : "ghost"}
					>
						<MaterialIcon
							className='me-1 text-sm'
							name='show_chart'
						/>
						Area
					</Button>
					<Button
						className={`h-7 px-2 text-xs ${
							chartType === "bar"
								? "bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]"
								: "text-[var(--warm-charcoal)]"
						}`}
						onClick={() => setChartType("bar")}
						size='sm'
						type='button'
						variant={chartType === "bar" ? "default" : "ghost"}
					>
						<MaterialIcon
							className='me-1 text-sm'
							name='bar_chart'
						/>
						Bar
					</Button>
				</div>
			</div>

			<ChartContainer
				config={CHART_CONFIG}
				height={240}
			>
				{chartType === "area" ? (
					<AreaChart
						colors={colors}
						data={transformed}
						dataKeys={dataKeys}
						height={240}
						xAxisKey='month'
					/>
				) : (
					<BarChart
						colors={colors}
						data={transformed}
						dataKeys={dataKeys}
						height={240}
						xAxisKey='month'
					/>
				)}
				<ChartLegend config={legendConfig} />
			</ChartContainer>
		</div>
	);
}
