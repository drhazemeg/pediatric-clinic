import type { ClinicLedgerEntry } from './use-finance';

// apps/web/src/hooks/use-transactions-csv-export.ts
import { useCallback } from 'react';

const escapeCsvCell = (value: string | number): string => {
  const str = String(value);
  const needsQuotes = /[",\n\r]/u.test(str);
  const escaped = str.replaceAll('"', '""');

  return needsQuotes ? `"${escaped}"` : escaped;
};

export function useTransactionsCsvExport() {
  const exportCsv = useCallback((rows: Array<ClinicLedgerEntry>) => {
    const headers = ['ID', 'Date', 'Kind', 'Category', 'Amount (EGP)', 'Note'];

    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((entry) =>
        [
          escapeCsvCell(entry.id),
          escapeCsvCell(new Date(entry.occurredAt).toISOString()),
          escapeCsvCell(entry.kind),
          escapeCsvCell(entry.category),
          escapeCsvCell((entry.amountCents / 100).toFixed(2)),
          escapeCsvCell(entry.note ?? ''),
        ].join(','),
      ),
    ];

    const csvContent = `\uFEFF${csvLines.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinic_ledger_${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.append(link);

    try {
      link.click();
    } catch (error) {
      link.remove();
      URL.revokeObjectURL(url);
      throw error;
    }

    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  return { exportCsv };
}
