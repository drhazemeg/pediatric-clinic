// apps/web/src/components/finance/FinanceTransactionsFilters.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";

interface FinanceTransactionsFiltersProps {
	searchQuery: string;
	onSearchQueryChange: (value: string) => void;
	kindFilter: "all" | "revenue" | "expense";
	onKindFilterChange?: (kind: "all" | "revenue" | "expense") => void;
	categoryFilter: string;
	onCategoryFilterChange: (category: string) => void;
	categories: string[];
	canExport: boolean;
	onExportCsv: () => void;
}

export function FinanceTransactionsFilters({
	searchQuery,
	onSearchQueryChange,
	kindFilter,
	onKindFilterChange,
	categoryFilter,
	onCategoryFilterChange,
	categories,
	canExport,
	onExportCsv
}: FinanceTransactionsFiltersProps) {
	return (
		<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
			<div className='flex flex-1 flex-wrap items-center gap-2'>
				<div className='relative min-w-[200px] flex-1 sm:max-w-xs'>
					<MaterialIcon
						className='absolute top-1/2 left-3 -translate-y-1/2 text-base text-[var(--warm-charcoal)]/60'
						name='search'
					/>
					<Input
						className='bg-[var(--pure-white)] pl-9 text-xs'
						onChange={e => onSearchQueryChange(e.target.value)}
						placeholder='Search note, category, or amount...'
						value={searchQuery}
					/>
				</div>

				{onKindFilterChange && (
					<Select
						onValueChange={v =>
							onKindFilterChange(v as "all" | "revenue" | "expense")
						}
						value={kindFilter}
					>
						<SelectTrigger className='w-32 bg-[var(--pure-white)] text-xs'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>All Types</SelectItem>
							<SelectItem value='revenue'>Revenue</SelectItem>
							<SelectItem value='expense'>Expense</SelectItem>
						</SelectContent>
					</Select>
				)}

				<Select
					onValueChange={v => v && onCategoryFilterChange(v)}
					value={categoryFilter}
				>
					<SelectTrigger className='w-36 bg-[var(--pure-white)] text-xs'>
						<SelectValue placeholder='Category' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>All Categories</SelectItem>
						{categories.map(cat => (
							<SelectItem
								key={cat}
								value={cat}
							>
								{cat}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className='flex items-center gap-2'>
				<Button
					className='gap-1.5 text-xs text-[var(--clay-black)] hover:bg-[var(--oat-border)]/20'
					disabled={!canExport}
					onClick={onExportCsv}
					size='sm'
					type='button'
					variant='outline'
				>
					<MaterialIcon
						className='text-sm'
						name='download'
					/>
					<span>Export CSV</span>
				</Button>
			</div>
		</div>
	);
}
