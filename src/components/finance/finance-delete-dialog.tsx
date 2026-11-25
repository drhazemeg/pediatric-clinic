import type { ClinicLedgerEntry } from '@/hooks/use-finance';

// apps/web/src/components/finance/FinanceDeleteDialog.tsx
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MaterialIcon } from '@/components/ui/material-icon';
import { formatEgp } from '@/hooks/use-finance';

interface FinanceDeleteDialogProps {
  target: ClinicLedgerEntry | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const FinanceDeleteDialog = ({
  target,
  onClose,
  onConfirm,
  isDeleting,
}: FinanceDeleteDialogProps) => (
  <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(target)}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>
          <span className="flex items-center gap-2 text-destructive">
            <span className="inline-flex text-xl">
              <MaterialIcon name="warning" />
            </span>
            <span>Delete Financial Transaction</span>
          </span>
        </DialogTitle>
        <DialogDescription>
          Are you sure you want to permanently delete this {target?.kind} entry
          of{' '}
          <span className="font-bold text-foreground">
            {formatEgp(target?.amountCents)}
          </span>{' '}
          ({target?.category})? This action will be logged in the clinic audit
          ledger.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          disabled={isDeleting}
          onClick={onClose}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={isDeleting}
          onClick={() => {
            onConfirm().catch(() => null);
          }}
          type="button"
          variant="destructive"
        >
          {isDeleting ? 'Deleting...' : 'Confirm Delete'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
