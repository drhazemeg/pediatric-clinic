// apps/web/src/components/clinical/ClinicalDataTable.tsx
// High-performance Clinical Data Table for Queue, Patient Directory & Ledger

import type * as React from "react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@/components/ui/table";

export interface ColumnDef<T> {
	id: string;
	header: string | React.ReactNode;
	cell: (item: T) => React.ReactNode;
	className?: string;
	align?: "start" | "center" | "end";
}

export interface ClinicalPaginationLabels {
	showingPage?: (params: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	}) => string;
	previous?: string;
	next?: string;
}

interface ClinicalDataTableProps<T> {
	data: T[];
	columns: ColumnDef<T>[];
	isLoading?: boolean;
	skeletonRows?: number;
	emptyMessage?: string;
	locale?: "ar" | "en";
	paginationLabels?: ClinicalPaginationLabels;
	keyExtractor: (item: T) => string;
	onRowClick?: (item: T) => void;
	pagination?: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
		onPageChange: (page: number) => void;
	};
}

export function ClinicalDataTable<T>({
	data,
	columns,
	isLoading = false,
	skeletonRows = 4,
	emptyMessage = "لا توجد سجلات طبية / No clinical records found.",
	locale = "ar",
	paginationLabels,
	keyExtractor,
	onRowClick,
	pagination
}: ClinicalDataTableProps<T>) {
	const skeletonRowKeys = useMemo(
		() =>
			Array.from(
				{ length: Math.max(1, skeletonRows) },
				(_, idx) => `skel-row-${idx}`
			),
		[skeletonRows]
	);
	const resolvedLabels = useMemo(() => {
		const isAr = locale === "ar";
		return {
			showingPage:
				paginationLabels?.showingPage ??
				(({ currentPage, totalPages, totalItems }) =>
					isAr
						? `صفحة ${currentPage} من ${totalPages} (${totalItems} سجل) · Page ${currentPage} of ${totalPages} (${totalItems} records)`
						: `Showing Page ${currentPage} of ${totalPages} (${totalItems} records)`),
			previous:
				paginationLabels?.previous ?? (isAr ? "السابق / Previous" : "Previous"),
			next: paginationLabels?.next ?? (isAr ? "التالي / Next" : "Next")
		};
	}, [locale, paginationLabels]);

	if (isLoading) {
		return (
			<div className='rounded-lg border border-[var(--oat-border)] bg-[var(--pure-white)] p-4 shadow-sm'>
				<div className='space-y-3'>
					<Skeleton className='h-8 w-full' />
					{skeletonRowKeys.map(key => (
						<Skeleton
							className='h-12 w-full'
							key={key}
						/>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className='rounded-lg border border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
			<div className='overflow-x-auto'>
				<Table>
					<TableHeader>
						<TableRow className='bg-[var(--oat-light)]/60 hover:bg-[var(--oat-light)]/60'>
							{columns.map(col => (
								<TableHead
									className={`text-xs font-bold text-[var(--clay-black)] ${
										col.align === "end"
											? "text-end"
											: col.align === "center"
												? "text-center"
												: "text-start"
									} ${col.className || ""}`}
									key={col.id}
								>
									{col.header}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.length === 0 ? (
							<TableRow>
								<TableCell
									className='py-12 text-center text-xs text-[var(--warm-charcoal)]/80'
									colSpan={columns.length}
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						) : (
							data.map(item => {
								const isClickable = Boolean(onRowClick);
								return (
									<TableRow
										className={
											isClickable
												? "cursor-pointer transition-colors hover:bg-[var(--oat-light)]/50 focus-visible:bg-[var(--oat-light)]/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--matcha-600)]"
												: ""
										}
										key={keyExtractor(item)}
										onClick={isClickable ? () => onRowClick?.(item) : undefined}
										onKeyDown={
											isClickable
												? e => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															onRowClick?.(item);
														}
													}
												: undefined
										}
										role={isClickable ? "button" : undefined}
										tabIndex={isClickable ? 0 : undefined}
									>
										{columns.map(col => (
											<TableCell
												className={`text-xs ${
													col.align === "end"
														? "text-end"
														: col.align === "center"
															? "text-center"
															: "text-start"
												} ${col.className || ""}`}
												key={col.id}
											>
												{col.cell(item)}
											</TableCell>
										))}
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>

			{pagination && pagination.totalPages > 1 && (
				<div className='flex flex-wrap items-center justify-between gap-2 border-t border-[var(--oat-border)] px-4 py-3 text-xs'>
					<span className='text-[var(--warm-charcoal)]'>
						{resolvedLabels.showingPage({
							currentPage: pagination.currentPage,
							totalPages: pagination.totalPages,
							totalItems: pagination.totalItems
						})}
					</span>
					<div className='flex items-center gap-2'>
						<Button
							disabled={pagination.currentPage <= 1}
							onClick={() =>
								pagination.onPageChange(pagination.currentPage - 1)
							}
							size='sm'
							variant='outline'
						>
							{resolvedLabels.previous}
						</Button>
						<Button
							disabled={pagination.currentPage >= pagination.totalPages}
							onClick={() =>
								pagination.onPageChange(pagination.currentPage + 1)
							}
							size='sm'
							variant='outline'
						>
							{resolvedLabels.next}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
