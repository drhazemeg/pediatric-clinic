// apps/web/src/components/finance/FinanceTransactionsTable.tsx

import {
	type ColumnDef,
	createSortedRowModel,
	rowSortingFeature,
	type SortingState,
	sortFn_alphanumeric,
	sortFn_basic,
	tableFeatures,
	useTable
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "@/components/ui/empty";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@/components/ui/table";
import { useActiveClinicId } from "@/hooks/use-active-clinic";
import type { ClinicLedgerEntry } from "@/hooks/use-finance";
import { formatEgp, useDeleteLedgerEntry } from "@/hooks/use-finance";
import { useTransactionsCsvExport } from "@/hooks/use-transactions-csv-export";
import { useFinanceStore } from "@/lib/web/finance-store";
import { FinanceDeleteDialog } from "./FinanceDeleteDialog";
import { FinanceTransactionsFilters } from "./FinanceTransactionsFilters";

interface Props {
	entries: ClinicLedgerEntry[];
	isLoading: boolean;
	kindFilter?: "all" | "revenue" | "expense";
	onKindFilterChange?: (kind: "all" | "revenue" | "expense") => void;
}

const financeTableFeatures = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: {
		alphanumeric: sortFn_alphanumeric,
		basic: sortFn_basic
	}
});

export function FinanceTransactionsTable({
	entries,
	isLoading,
	kindFilter = "all",
	onKindFilterChange
}: Props) {
	const clinicId = useActiveClinicId();
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "date", desc: true }
	]);

	const openReceiptModal = useFinanceStore(s => s.openReceiptModal);
	const openRecordModal = useFinanceStore(s => s.openRecordModal);
	const deleteMutation = useDeleteLedgerEntry(clinicId);
	const { exportCsv } = useTransactionsCsvExport();

	const [deleteTarget, setDeleteTarget] = useState<ClinicLedgerEntry | null>(
		null
	);

	const uniqueCategories = useMemo(() => {
		const set = new Set<string>();
		for (const e of entries) {
			set.add(e.category);
		}
		return Array.from(set).sort();
	}, [entries]);

	const filteredRows = useMemo(() => {
		return entries.filter(e => {
			if (kindFilter !== "all" && e.kind !== kindFilter) return false;
			if (categoryFilter !== "all" && e.category !== categoryFilter)
				return false;
			if (searchQuery.trim()) {
				const term = searchQuery.toLowerCase().trim();
				const noteMatch = (e.note ?? "").toLowerCase().includes(term);
				const catMatch = e.category.toLowerCase().includes(term);
				const amtMatch = (e.amountCents / 100).toFixed(2).includes(term);
				if (!noteMatch && !catMatch && !amtMatch) return false;
			}
			return true;
		});
	}, [entries, kindFilter, categoryFilter, searchQuery]);

	const columns = useMemo<
		ColumnDef<typeof financeTableFeatures, ClinicLedgerEntry>[]
	>(
		() => [
			{
				id: "date",
				accessorFn: row => new Date(row.occurredAt).getTime(),
				header: "Date & Time",
				sortFn: "basic",
				cell: ({ row }) => {
					const date = new Date(row.original.occurredAt);
					return (
						<div className='flex flex-col'>
							<span className='text-xs font-semibold text-[var(--clay-black)]'>
								{date.toLocaleDateString("en-GB", {
									day: "2-digit",
									month: "short",
									year: "numeric"
								})}
							</span>
							<span className='font-mono text-[10px] text-[var(--warm-charcoal)]/60'>
								{date.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit"
								})}
							</span>
						</div>
					);
				}
			},
			{
				id: "kind",
				accessorKey: "kind",
				header: "Type",
				sortFn: "alphanumeric",
				cell: ({ row }) => {
					const isRev = row.original.kind === "revenue";
					return (
						<Badge
							className={`gap-1 text-[10px] font-semibold uppercase ${
								isRev
									? "bg-emerald-100 text-emerald-800"
									: "bg-red-100 text-red-800"
							}`}
							variant={isRev ? "success" : "destructive"}
						>
							<MaterialIcon
								className='text-xs'
								name={isRev ? "arrow_upward" : "arrow_downward"}
							/>
							<span>{row.original.kind}</span>
						</Badge>
					);
				}
			},
			{
				id: "category",
				accessorKey: "category",
				header: "Category",
				sortFn: "alphanumeric",
				cell: ({ row }) => (
					<span className='inline-flex items-center gap-1 text-xs font-medium text-[var(--clay-black)]'>
						<span className='h-1.5 w-1.5 rounded-full bg-[var(--matcha-600)]' />
						{row.original.category}
					</span>
				)
			},
			{
				id: "note",
				accessorKey: "note",
				header: "Description / Receipt Note",
				sortFn: "alphanumeric",
				cell: ({ row }) => (
					<span className='line-clamp-1 max-w-xs text-xs text-[var(--warm-charcoal)]'>
						{row.original.note || "—"}
					</span>
				)
			},
			{
				id: "amount",
				accessorFn: row => row.amountCents,
				header: () => <div className='text-end'>Amount (EGP)</div>,
				sortFn: "basic",
				cell: ({ row }) => {
					const isRev = row.original.kind === "revenue";
					return (
						<div className='text-end'>
							<span
								className={`font-mono text-sm font-bold ${
									isRev ? "text-emerald-700" : "text-red-600"
								}`}
							>
								{isRev ? "+" : "-"}
								{formatEgp(row.original.amountCents)}
							</span>
						</div>
					);
				}
			},
			{
				id: "actions",
				header: () => <div className='text-end'>Actions</div>,
				enableSorting: false,
				cell: ({ row }) => {
					const entry = row.original;
					return (
						<div className='flex items-center justify-end gap-1'>
							<Button
								className='h-8 w-8 p-0 text-[var(--warm-charcoal)] hover:text-emerald-700'
								onClick={() => openReceiptModal(entry)}
								size='sm'
								title='Print / View Receipt'
								type='button'
								variant='ghost'
							>
								<MaterialIcon
									className='text-base'
									name='receipt'
								/>
							</Button>
							<Button
								className='h-8 w-8 p-0 text-[var(--warm-charcoal)] hover:text-red-600'
								onClick={() => setDeleteTarget(entry)}
								size='sm'
								title='Delete Transaction'
								type='button'
								variant='ghost'
							>
								<MaterialIcon
									className='text-base'
									name='delete_outline'
								/>
							</Button>
						</div>
					);
				}
			}
		],
		[openReceiptModal]
	);

	const table = useTable({
		features: financeTableFeatures,
		data: filteredRows,
		columns,
		state: { sorting },
		onSortingChange: setSorting
	});

	const handleDeleteConfirm = async () => {
		if (!deleteTarget) return;
		await deleteMutation.mutateAsync({
			id: deleteTarget.id,
			clinicId
		});
		setDeleteTarget(null);
	};

	return (
		<div className='space-y-4'>
			<FinanceTransactionsFilters
				canExport={filteredRows.length > 0}
				categories={uniqueCategories}
				categoryFilter={categoryFilter}
				kindFilter={kindFilter}
				onCategoryFilterChange={setCategoryFilter}
				onExportCsv={() => exportCsv(filteredRows)}
				onKindFilterChange={onKindFilterChange}
				onSearchQueryChange={setSearchQuery}
				searchQuery={searchQuery}
			/>

			<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardContent className='p-0'>
					{isLoading ? (
						<div className='space-y-3 p-6'>
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-full' />
						</div>
					) : table.getRowModel().rows.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<MaterialIcon name='receipt_long' />
								</EmptyMedia>
								<EmptyTitle level={2}>No transactions found</EmptyTitle>
								<EmptyDescription>
									{searchQuery || categoryFilter !== "all"
										? "No financial records matched your search filters."
										: "No financial entries have been recorded yet for this period."}
								</EmptyDescription>
								<div className='mt-4 flex gap-2'>
									<Button
										className='bg-emerald-600 text-white hover:bg-emerald-700'
										onClick={() => openRecordModal("revenue")}
										size='sm'
										type='button'
									>
										<MaterialIcon
											className='me-1'
											name='add'
										/>
										Record Revenue
									</Button>
									<Button
										className='bg-red-600 text-white hover:bg-red-700'
										onClick={() => openRecordModal("expense")}
										size='sm'
										type='button'
									>
										<MaterialIcon
											className='me-1'
											name='remove'
										/>
										Record Expense
									</Button>
								</div>
							</EmptyHeader>
						</Empty>
					) : (
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map(headerGroup => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map(header => (
											<TableHead key={header.id}>
												{header.isPlaceholder ? null : header.column.getCanSort() ? (
													<button
														className='inline-flex cursor-pointer items-center gap-1 font-semibold hover:text-[var(--clay-black)]'
														onClick={header.column.getToggleSortingHandler()}
														type='button'
													>
														<table.FlexRender header={header} />
														<MaterialIcon
															className='text-xs'
															name={
																header.column.getIsSorted() === "asc"
																	? "arrow_upward"
																	: header.column.getIsSorted() === "desc"
																		? "arrow_downward"
																		: "unfold_more"
															}
														/>
													</button>
												) : (
													<table.FlexRender header={header} />
												)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows.map(row => (
									<TableRow key={row.id}>
										{row.getAllCells().map(cell => (
											<TableCell key={cell.id}>
												<table.FlexRender cell={cell} />
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<FinanceDeleteDialog
				isDeleting={deleteMutation.isPending}
				onClose={() => setDeleteTarget(null)}
				onConfirm={handleDeleteConfirm}
				target={deleteTarget}
			/>
		</div>
	);
}
