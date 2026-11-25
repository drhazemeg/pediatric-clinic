// apps/web/src/components/finance/FinanceSummaryCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEgp } from "@/hooks/use-finance";

interface SummaryData {
	totalRevenueCents: number;
	totalExpenseCents: number;
	netBalanceCents: number;
}

interface Props {
	summary: SummaryData | null | undefined;
	isLoading: boolean;
}

function KpiCard({
	label,
	arabic,
	value,
	isLoading,
	colorClass,
	icon,
	trend
}: {
	label: string;
	arabic: string;
	value: string;
	isLoading: boolean;
	colorClass: string;
	icon: string;
	trend?: "up" | "down" | "neutral";
}) {
	return (
		<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm transition-shadow hover:shadow-md'>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
				<CardTitle className='text-xs font-semibold tracking-wide text-[var(--warm-charcoal)] uppercase'>
					<span>{label}</span>
					<span className='ms-1 text-[var(--warm-charcoal)]/50'>
						({arabic})
					</span>
				</CardTitle>
				<MaterialIcon
					className={`text-xl ${colorClass}`}
					name={icon}
				/>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className='h-9 w-32' />
				) : (
					<p
						className={`font-mono text-3xl font-extrabold tracking-tight ${colorClass}`}
					>
						{value}
					</p>
				)}
				{trend && !isLoading && (
					<p
						className={`mt-1 flex items-center gap-0.5 text-xs ${
							trend === "up"
								? "text-emerald-600"
								: trend === "down"
									? "text-red-500"
									: "text-[var(--warm-charcoal)]/60"
						}`}
					>
						<MaterialIcon
							className='text-base'
							name={
								trend === "up"
									? "trending_up"
									: trend === "down"
										? "trending_down"
										: "trending_flat"
							}
						/>
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export function FinanceSummaryCards({ summary, isLoading }: Props) {
	const net = summary?.netBalanceCents ?? 0;
	const netTrend: "up" | "down" | "neutral" =
		net > 0 ? "up" : net < 0 ? "down" : "neutral";

	return (
		<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
			<KpiCard
				arabic='إجمالي الإيرادات'
				colorClass='text-emerald-700'
				icon='payments'
				isLoading={isLoading}
				label='Total Revenue'
				trend='neutral'
				value={formatEgp(summary?.totalRevenueCents)}
			/>
			<KpiCard
				arabic='إجمالي المصروفات'
				colorClass='text-red-600'
				icon='receipt_long'
				isLoading={isLoading}
				label='Total Expenses'
				trend='neutral'
				value={formatEgp(summary?.totalExpenseCents)}
			/>
			<KpiCard
				arabic='صافي الدخل'
				colorClass={net >= 0 ? "text-[var(--clay-black)]" : "text-red-700"}
				icon='account_balance_wallet'
				isLoading={isLoading}
				label='Net Cash Margin'
				trend={netTrend}
				value={formatEgp(summary?.netBalanceCents)}
			/>
		</div>
	);
}
