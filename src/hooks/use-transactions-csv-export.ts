// apps/web/src/hooks/use-transactions-csv-export.ts
import { useCallback } from "react";
import type { ClinicLedgerEntry } from "./use-finance";

function escapeCsvCell(value: string | number): string {
	const str = String(value);
	const needsQuotes = /[",\n\r]/.test(str);
	const escaped = str.replace(/"/g, '""');
	return needsQuotes ? `"${escaped}"` : escaped;
}

export function useTransactionsCsvExport() {
	const exportCsv = useCallback((rows: ClinicLedgerEntry[]) => {
		const headers = ["ID", "Date", "Kind", "Category", "Amount (EGP)", "Note"];
		const csvLines = [
			headers.map(escapeCsvCell).join(","),
			...rows.map(entry =>
				[
					escapeCsvCell(entry.id),
					escapeCsvCell(new Date(entry.occurredAt).toISOString()),
					escapeCsvCell(entry.kind),
					escapeCsvCell(entry.category),
					escapeCsvCell((entry.amountCents / 100).toFixed(2)),
					escapeCsvCell(entry.note ?? "")
				].join(",")
			)
		];

		const csvContent = `\uFEFF${csvLines.join("\n")}`;
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `clinic_ledger_${new Date().toISOString().slice(0, 10)}.csv`;

		document.body.appendChild(link);
		try {
			link.click();
		} finally {
			link.remove();
			URL.revokeObjectURL(url);
		}
	}, []);

	return { exportCsv };
}
