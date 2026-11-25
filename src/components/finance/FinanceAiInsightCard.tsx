// apps/web/src/components/finance/FinanceAiInsightCard.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveClinicId } from "@/hooks/use-active-clinic";
import { type LedgerDateRange, useFinanceAiInsight } from "@/hooks/use-finance";

interface Props {
	range?: LedgerDateRange;
}

export function FinanceAiInsightCard({ range }: Props) {
	const clinicId = useActiveClinicId();
	const {
		data: insight,
		isLoading,
		isError,
		error,
		isFetching,
		refetch
	} = useFinanceAiInsight(clinicId, range);

	if (isLoading) {
		return (
			<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardHeader className='pb-3'>
					<Skeleton className='h-6 w-48' />
					<Skeleton className='h-4 w-72' />
				</CardHeader>
				<CardContent className='space-y-3'>
					<Skeleton className='h-16 w-full rounded-lg' />
					<Skeleton className='h-12 w-full rounded-lg' />
				</CardContent>
			</Card>
		);
	}

	if (isError || !insight) {
		return (
			<Card className='border-red-200 bg-[var(--pure-white)] shadow-sm'>
				<CardHeader className='pb-2'>
					<div className='flex items-center justify-between gap-2'>
						<div className='flex items-center gap-2'>
							<MaterialIcon
								className='text-red-600'
								name='error_outline'
							/>
							<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
								Financial Health Summary Unavailable
							</CardTitle>
						</div>
						<Button
							disabled={isFetching}
							onClick={() => void refetch()}
							size='sm'
							type='button'
							variant='outline'
						>
							<MaterialIcon
								className={`me-1 text-sm ${isFetching ? "animate-spin" : ""}`}
								name='refresh'
							/>
							Retry
						</Button>
					</div>
					<CardDescription className='text-xs text-red-700'>
						{error instanceof Error
							? error.message
							: "Unable to load financial scorecard at this time (تعذر تحميل التقرير المالي الذكي)."}
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const isHealthy = insight.status === "healthy";
	const scoreColor =
		insight.healthScore >= 80
			? "border-emerald-300 bg-emerald-100 text-emerald-700"
			: insight.healthScore >= 60
				? "border-amber-300 bg-amber-100 text-amber-700"
				: "border-red-300 bg-red-100 text-red-700";

	return (
		<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
			<CardHeader className='flex flex-row items-start justify-between pb-3'>
				<div>
					<div className='flex items-center gap-2'>
						<div className='flex h-7 w-7 items-center justify-center rounded-md bg-[var(--matcha-500)]/15 text-[var(--matcha-700)]'>
							<MaterialIcon
								className='text-base'
								name='auto_awesome'
							/>
						</div>
						<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
							AI Financial Advisory &amp; Health Scorecard
						</CardTitle>
						<Badge
							className='text-[10px] font-bold tracking-wider uppercase'
							variant={isHealthy ? "success" : "warning"}
						>
							{insight.status}
						</Badge>
					</div>
					<CardDescription className='mt-1 text-xs text-[var(--warm-charcoal)]/80'>
						Automated summary of clinic revenue, expenses, and balance
					</CardDescription>
				</div>

				<div className='flex items-center gap-2'>
					<div
						className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs font-bold ${scoreColor}`}
					>
						<MaterialIcon
							className='text-sm'
							name='speed'
						/>
						<span>{insight.healthScore} / 100</span>
					</div>
					<Button
						className='h-8 w-8 p-0 text-[var(--warm-charcoal)]'
						disabled={isFetching}
						onClick={() => void refetch()}
						size='sm'
						title='Refresh financial summary'
						type='button'
						variant='ghost'
					>
						<MaterialIcon
							className={`text-base ${isFetching ? "animate-spin" : ""}`}
							name='refresh'
						/>
					</Button>
				</div>
			</CardHeader>

			<CardContent className='space-y-4'>
				<div className='space-y-2 rounded-xl border border-[var(--oat-border)] bg-[var(--oat-border)]/20 p-3.5'>
					<p className='text-xs leading-relaxed font-medium text-[var(--clay-black)]'>
						{insight.summaryEn}
					</p>
					<p className='text-end font-sans text-xs leading-relaxed text-[var(--warm-charcoal)]'>
						{insight.summaryAr}
					</p>
				</div>

				<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
					<div className='flex items-center gap-3 rounded-lg border border-[var(--oat-border)] p-2.5'>
						<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700'>
							<MaterialIcon
								className='text-xl'
								name='trending_up'
							/>
						</div>
						<div>
							<span className='text-[10px] font-semibold text-[var(--warm-charcoal)]/60 uppercase'>
								Leading Revenue Driver
							</span>
							<p className='text-xs font-bold text-[var(--clay-black)]'>
								{insight.topRevenueSource}
							</p>
						</div>
					</div>

					<div className='flex items-center gap-3 rounded-lg border border-[var(--oat-border)] p-2.5'>
						<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700'>
							<MaterialIcon
								className='text-xl'
								name='pie_chart'
							/>
						</div>
						<div>
							<span className='text-[10px] font-semibold text-[var(--warm-charcoal)]/60 uppercase'>
								Primary Cost Center
							</span>
							<p className='text-xs font-bold text-[var(--clay-black)]'>
								{insight.topExpenseSource}
							</p>
						</div>
					</div>
				</div>

				{insight.recommendations.length > 0 && (
					<div className='space-y-2'>
						<span className='flex items-center gap-1 text-xs font-bold tracking-wider text-[var(--warm-charcoal)] uppercase'>
							<MaterialIcon
								className='text-sm text-amber-500'
								name='lightbulb'
							/>
							Financial Recommendations
						</span>
						<div className='grid grid-cols-1 gap-2'>
							{insight.recommendations.map(rec => (
								<div
									className='space-y-1 rounded-lg border border-[var(--oat-border)]/70 bg-[var(--pure-white)] p-2.5 text-xs text-[var(--clay-black)]'
									key={rec.en}
								>
									<p className='font-medium text-[var(--clay-black)]'>
										• {rec.en}
									</p>
									<p className='text-end font-sans text-[var(--warm-charcoal)]/80'>
										• {rec.ar}
									</p>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
