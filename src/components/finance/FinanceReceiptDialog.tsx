// apps/web/src/components/finance/FinanceReceiptDialog.tsx
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatEgp } from "@/hooks/use-finance";
import { useFinanceStore } from "@/lib/web/finance-store";

const RECEIPT_PRINT_CSS = `
@media print {
	body * {
		visibility: hidden;
	}
	.printable-receipt,
	.printable-receipt * {
		visibility: visible;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	.printable-receipt {
		position: fixed;
		inset: 0;
		margin: 0;
		padding: 24px;
		background: #ffffff;
		z-index: 9999;
	}
	.no-print {
		display: none !important;
	}
}
`;

export function FinanceReceiptDialog() {
	const isReceiptOpen = useFinanceStore(s => s.isReceiptOpen);
	const receiptEntry = useFinanceStore(s => s.receiptEntry);
	const closeReceiptModal = useFinanceStore(s => s.closeReceiptModal);

	if (!receiptEntry) return null;

	const isRev = receiptEntry.kind === "revenue";
	const date = new Date(receiptEntry.occurredAt);
	const receiptNo = `REC-${date.getFullYear()}-${String(receiptEntry.id).padStart(5, "0")}`;

	const handlePrint = () => {
		window.print();
	};

	return (
		<Dialog
			onOpenChange={open => !open && closeReceiptModal()}
			open={isReceiptOpen}
		>
			<style>{RECEIPT_PRINT_CSS}</style>
			<DialogContent className='max-w-xl bg-[var(--pure-white)] p-6'>
				<div className='printable-receipt'>
					<DialogHeader className='border-b border-[var(--oat-border)] pb-4'>
						<div className='flex items-center justify-between'>
							<div className='flex items-center gap-2'>
								<div className='flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--matcha-600)] text-white'>
									<MaterialIcon
										className='text-xl'
										name='local_hospital'
									/>
								</div>
								<div>
									<DialogTitle className='text-base font-bold text-[var(--clay-black)]'>
										Smart Clinic — Pediatric &amp; Neonatal Care
									</DialogTitle>
									<p className='text-xs text-[var(--warm-charcoal)]/80'>
										عيادة طب الأطفال وحديثي الولادة — Hurghada Clinic
									</p>
								</div>
							</div>
							<div className='text-end'>
								<span className='font-mono text-xs font-bold text-[var(--matcha-700)]'>
									{receiptNo}
								</span>
								<p className='text-[10px] text-[var(--warm-charcoal)]/60'>
									{date.toLocaleDateString("en-GB", {
										day: "2-digit",
										month: "short",
										year: "numeric"
									})}
								</p>
							</div>
						</div>
					</DialogHeader>

					<div className='space-y-4 py-4'>
						<div className='rounded-lg bg-[var(--oat-border)]/20 p-3 text-center'>
							<span className='text-xs font-semibold tracking-wider text-[var(--warm-charcoal)] uppercase'>
								{isRev
									? "Official Payment Receipt (إيصال استلام نقدية)"
									: "Expense Disbursement Voucher (سند صرف)"}
							</span>
							<div
								className={`mt-2 font-mono text-3xl font-extrabold ${isRev ? "text-emerald-700" : "text-red-600"}`}
							>
								{formatEgp(receiptEntry.amountCents)}
							</div>
						</div>

						<div className='grid grid-cols-2 gap-3 text-xs'>
							<div className='rounded-lg border border-[var(--oat-border)] p-2.5'>
								<span className='text-[10px] text-[var(--warm-charcoal)]/60 uppercase'>
									Transaction Type
								</span>
								<p className='font-bold text-[var(--clay-black)] capitalize'>
									{receiptEntry.kind} ({isRev ? "إيراد عيادة" : "مصروف تشغيلي"})
								</p>
							</div>

							<div className='rounded-lg border border-[var(--oat-border)] p-2.5'>
								<span className='text-[10px] text-[var(--warm-charcoal)]/60 uppercase'>
									Category / Service
								</span>
								<p className='font-bold text-[var(--clay-black)]'>
									{receiptEntry.category}
								</p>
							</div>

							<div className='col-span-2 rounded-lg border border-[var(--oat-border)] p-2.5'>
								<span className='text-[10px] text-[var(--warm-charcoal)]/60 uppercase'>
									Description &amp; Patient Note
								</span>
								<p className='font-medium text-[var(--clay-black)]'>
									{receiptEntry.note || "No specific note recorded"}
								</p>
							</div>

							<div className='rounded-lg border border-[var(--oat-border)] p-2.5'>
								<span className='text-[10px] text-[var(--warm-charcoal)]/60 uppercase'>
									Transaction Date &amp; Time
								</span>
								<p className='font-mono text-[var(--clay-black)]'>
									{date.toLocaleString([], {
										dateStyle: "medium",
										timeStyle: "short"
									})}
								</p>
							</div>

							<div className='rounded-lg border border-[var(--oat-border)] p-2.5'>
								<span className='text-[10px] text-[var(--warm-charcoal)]/60 uppercase'>
									Status &amp; Verification
								</span>
								<p className='flex items-center gap-1 font-semibold text-emerald-700'>
									<MaterialIcon
										className='text-sm'
										name='verified'
									/>
									Recorded in Clinic Ledger
								</p>
							</div>
						</div>

						<div className='mt-6 flex items-end justify-between border-t border-dashed border-[var(--oat-border)] pt-4 text-xs text-[var(--warm-charcoal)]'>
							<div className='space-y-6'>
								<span>Authorized Clinic Officer (المسؤول):</span>
								<div className='h-6 w-36 border-b border-dotted border-[var(--warm-charcoal)]/40' />
							</div>
							<div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--oat-border)] p-3 text-[10px] text-[var(--warm-charcoal)]/50'>
								<MaterialIcon
									className='text-2xl text-[var(--warm-charcoal)]/30'
									name='verified_user'
								/>
								<span>Clinic Official Stamp</span>
								<span>ختم العيادة المعتمد</span>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter className='no-print border-t border-[var(--oat-border)] pt-3'>
					<Button
						onClick={closeReceiptModal}
						type='button'
						variant='outline'
					>
						Close
					</Button>
					<Button
						className='gap-1.5 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
						onClick={handlePrint}
						type='button'
					>
						<MaterialIcon
							className='text-base'
							name='print'
						/>
						<span>Print Receipt (طباعة الإيصال)</span>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
