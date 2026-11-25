// apps/web/src/components/finance/FinanceReceiptDialog.tsx
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MaterialIcon } from '@/components/ui/material-icon';
import { formatEgp } from '@/hooks/use-finance';
import { useFinanceStore } from '@/lib/web/finance-store';

const handlePrint = () => {
  window.print();
};

export function FinanceReceiptDialog() {
  const isReceiptOpen = useFinanceStore((s) => s.isReceiptOpen);
  const receiptEntry = useFinanceStore((s) => s.receiptEntry);
  const closeReceiptModal = useFinanceStore((s) => s.closeReceiptModal);

  if (receiptEntry === null) {
    return null;
  }

  const isRev = receiptEntry.kind === 'revenue';
  const date = new Date(receiptEntry.occurredAt);
  const receiptNo = `REC-${date.getFullYear()}-${String(receiptEntry.id).padStart(5, '0')}`;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          closeReceiptModal();
        }
      }}
      open={isReceiptOpen}
    >
      <DialogContent>
        <div className="p-2 print:fixed print:inset-0 print:z-50 print:bg-background print:p-6">
          <div className="border-b border-border pb-4">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-xl text-primary-foreground">
                    <MaterialIcon name="local_hospital" />
                  </div>
                  <div>
                    <DialogTitle>
                      Smart Clinic — Pediatric &amp; Neonatal Care
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                      عيادة طب الأطفال وحديثي الولادة — Hurghada Clinic
                    </p>
                  </div>
                </div>
                <div className="text-end">
                  <span className="font-mono text-xs font-bold text-primary">
                    {receiptNo}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {date.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {isRev
                  ? 'Official Payment Receipt (إيصال استلام نقدية)'
                  : 'Expense Disbursement Voucher (سند صرف)'}
              </span>
              <div
                className={`mt-2 font-mono text-3xl font-extrabold ${
                  isRev ? 'text-brand-success' : 'text-destructive'
                }`}
              >
                {formatEgp(receiptEntry.amountCents)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border p-2.5">
                <span className="text-xs text-muted-foreground uppercase">
                  Transaction Type
                </span>
                <p className="font-bold text-foreground capitalize">
                  {receiptEntry.kind} ({isRev ? 'إيراد عيادة' : 'مصروف تشغيلي'})
                </p>
              </div>

              <div className="rounded-lg border border-border p-2.5">
                <span className="text-xs text-muted-foreground uppercase">
                  Category / Service
                </span>
                <p className="font-bold text-foreground">
                  {receiptEntry.category}
                </p>
              </div>

              <div className="col-span-2 rounded-lg border border-border p-2.5">
                <span className="text-xs text-muted-foreground uppercase">
                  Description &amp; Patient Note
                </span>
                <p className="font-medium text-foreground">
                  {receiptEntry.note !== null && receiptEntry.note !== ''
                    ? receiptEntry.note
                    : 'No specific note recorded'}
                </p>
              </div>

              <div className="rounded-lg border border-border p-2.5">
                <span className="text-xs text-muted-foreground uppercase">
                  Transaction Date &amp; Time
                </span>
                <p className="font-mono text-foreground">
                  {date.toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              <div className="rounded-lg border border-border p-2.5">
                <span className="text-xs text-muted-foreground uppercase">
                  Status &amp; Verification
                </span>
                <p className="flex items-center gap-1 font-semibold text-brand-success">
                  <span className="inline-flex text-sm">
                    <MaterialIcon name="verified" />
                  </span>
                  Recorded in Clinic Ledger
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between border-t border-dashed border-border pt-4 text-xs text-muted-foreground">
              <div className="space-y-6">
                <span>Authorized Clinic Officer (المسؤول):</span>
                <div className="h-6 w-36 border-b border-dotted border-border" />
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                <span className="inline-flex text-2xl text-muted-foreground/50">
                  <MaterialIcon name="verified_user" />
                </span>
                <span>Clinic Official Stamp</span>
                <span>ختم العيادة المعتمد</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-3 print:hidden">
          <DialogFooter>
            <Button onClick={closeReceiptModal} type="button" variant="outline">
              Close
            </Button>
            <Button onClick={handlePrint} type="button" variant="default">
              <span className="me-1 inline-flex text-base">
                <MaterialIcon name="print" />
              </span>
              <span>Print Receipt (طباعة الإيصال)</span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
