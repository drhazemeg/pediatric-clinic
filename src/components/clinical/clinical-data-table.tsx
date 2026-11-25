// apps/web/src/components/clinical/ClinicalDataTable.tsx
// High-performance Clinical Data Table for Queue, Patient Directory & Ledger

import type * as React from 'react';

import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ColumnDef<T> {
  id: string;
  header: string | React.ReactNode;
  cell: (item: T) => React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
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
  data: Array<T>;
  columns: Array<ColumnDef<T>>;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  locale?: 'ar' | 'en';
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

const ALIGN_CLASS_MAP = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
} as const;

export const ClinicalDataTable = <T,>({
  data,
  columns,
  isLoading = false,
  skeletonRows = 4,
  emptyMessage = 'لا توجد سجلات طبية / No clinical records found.',
  locale = 'ar',
  paginationLabels,
  keyExtractor,
  onRowClick,
  pagination,
}: ClinicalDataTableProps<T>) => {
  const skeletonRowKeys = useMemo(
    () =>
      Array.from(
        { length: Math.max(1, skeletonRows) },
        (_, idx) => `skel-row-${idx}`,
      ),
    [skeletonRows],
  );

  const resolvedLabels = useMemo(() => {
    const isAr = locale === 'ar';

    return {
      showingPage:
        paginationLabels?.showingPage ??
        (({ currentPage, totalPages, totalItems }) =>
          isAr
            ? `صفحة ${currentPage} من ${totalPages} (${totalItems} سجل) · Page ${currentPage} of ${totalPages} (${totalItems} records)`
            : `Showing Page ${currentPage} of ${totalPages} (${totalItems} records)`),
      previous:
        paginationLabels?.previous ?? (isAr ? 'السابق / Previous' : 'Previous'),
      next: paginationLabels?.next ?? (isAr ? 'التالي / Next' : 'Next'),
    };
  }, [locale, paginationLabels]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          {skeletonRowKeys.map((key) => (
            <Skeleton className="h-12 w-full" key={key} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                const alignClass = ALIGN_CLASS_MAP[col.align ?? 'start'];

                return (
                  <TableHead key={col.id}>
                    <div
                      className={`text-xs font-bold text-foreground ${alignClass} ${col.className ?? ''}`}
                    >
                      {col.header}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    {emptyMessage}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow
                  key={keyExtractor(item)}
                  onClick={
                    onRowClick === undefined
                      ? undefined
                      : () => onRowClick(item)
                  }
                >
                  {columns.map((col) => {
                    const alignClass = ALIGN_CLASS_MAP[col.align ?? 'start'];

                    return (
                      <TableCell key={col.id}>
                        <div
                          className={`text-xs ${alignClass} ${col.className ?? ''} ${onRowClick === undefined ? '' : 'cursor-pointer'}`}
                        >
                          {col.cell(item)}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination !== undefined && pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs">
          <span className="text-muted-foreground">
            {resolvedLabels.showingPage({
              currentPage: pagination.currentPage,
              totalPages: pagination.totalPages,
              totalItems: pagination.totalItems,
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              disabled={pagination.currentPage <= 1}
              onClick={() =>
                pagination.onPageChange(pagination.currentPage - 1)
              }
              size="sm"
              type="button"
              variant="outline"
            >
              {resolvedLabels.previous}
            </Button>
            <Button
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() =>
                pagination.onPageChange(pagination.currentPage + 1)
              }
              size="sm"
              type="button"
              variant="outline"
            >
              {resolvedLabels.next}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
