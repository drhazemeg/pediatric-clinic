// apps/web/src/components/finance/FinanceCategoryBreakdown.tsx

import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEgp } from "@/hooks/use-finance";
import { CATEGORY_META } from "@/lib/web/finance-constants";

interface CategoryBreakdown {
	category: string;
	amountCents: number;
	count: number;
}

interface Props {
	items: CategoryBreakdown[];
	isLoading: boolean;
	kind: "revenue" | "expense";
}

const SKELETON_KEYS = ["cat-skel-1", "cat-skel-2", "cat-skel-3", "cat-skel-4"];

export function FinanceCategoryBreakdown({ items, isLoading, kind }: Props) {
	if (isLoading) {
		return (
			<div className='space-y-3'>
				{SKELETON_KEYS.map(id => (
					<Skeleton
						className='h-12 w-full rounded-lg'
						key={id}
					/>
				))}
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className='flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--oat-border)] p-4 text-center text-xs text-[var(--warm-charcoal)]/60'>
				<MaterialIcon
					className='mb-1 text-2xl text-[var(--warm-charcoal)]/40'
					name='category'
				/>
				<p>No {kind} categories recorded in this period</p>
			</div>
		);
	}

	const totalAmount = items.reduce((acc, i) => acc + i.amountCents, 0);
	const barColor = kind === "revenue" ? "bg-emerald-500" : "bg-red-500";
	const textColor = kind === "revenue" ? "text-emerald-700" : "text-red-600";

	return (
		<ul className='space-y-3'>
			{items.map(item => {
				const pct =
					totalAmount > 0
						? Math.round((item.amountCents / totalAmount) * 100)
						: 0;
				const meta = CATEGORY_META[item.category] ?? {
					icon: kind === "revenue" ? "payments" : "receipt_long",
					ar: item.category,
					en: item.category,
					kind
				};

				return (
					<li
						className='space-y-1.5 rounded-lg border border-[var(--oat-border)]/60 bg-[var(--pure-white)] p-2.5 transition-colors hover:border-[var(--oat-border)]'
						key={item.category}
					>
						<div className='flex items-center justify-between text-xs'>
							<div className='flex items-center gap-1.5'>
								<MaterialIcon
									className='text-base text-[var(--warm-charcoal)]'
									name={meta.icon}
								/>
								<span className='font-semibold text-[var(--clay-black)]'>
									{item.category}
								</span>
								<span className='text-[11px] text-[var(--warm-charcoal)]/60'>
									({meta.ar})
								</span>
								<span className='rounded-full bg-[var(--oat-border)]/40 px-1.5 py-0.5 text-[10px] text-[var(--warm-charcoal)]'>
									×{item.count}
								</span>
							</div>
							<div className='flex items-center gap-2'>
								<span className='font-mono text-[11px] text-[var(--warm-charcoal)]/70'>
									{pct}%
								</span>
								<span className={`font-mono font-bold ${textColor}`}>
									{formatEgp(item.amountCents)}
								</span>
							</div>
						</div>
						<div className='h-2 w-full overflow-hidden rounded-full bg-[var(--oat-border)]/40'>
							<div
								aria-hidden='true'
								className={`h-full rounded-full transition-all duration-500 ${barColor}`}
								style={{ width: `${Math.max(pct, 2)}%` }}
							/>
						</div>
					</li>
				);
			})}
		</ul>
	);
}
