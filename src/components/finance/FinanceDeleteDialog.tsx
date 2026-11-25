// apps/web/src/components/finance/FinanceDeleteDialog.tsx
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { type ClinicLedgerEntry, formatEgp } from "@/hooks/use-finance";

interface FinanceDeleteDialogProps {
	target: ClinicLedgerEntry | null;
	onClose: () => void;
	onConfirm: () => Promise<void>;
	isDeleting: boolean;
}

export function FinanceDeleteDialog({
	target,
	onClose,
	onConfirm,
	isDeleting
}: FinanceDeleteDialogProps) {
	return (
		<Dialog
			onOpenChange={open => !open && onClose()}
			open={Boolean(target)}
		>
			<DialogContent className='max-w-md bg-[var(--pure-white)]'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2 text-red-600'>
						<MaterialIcon
							className='text-xl'
							name='warning'
						/>
						Delete Financial Transaction
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to permanently delete this {target?.kind}{" "}
						entry of{" "}
						<span className='font-bold text-[var(--clay-black)]'>
							{formatEgp(target?.amountCents)}
						</span>{" "}
						({target?.category})? This action will be logged in the clinic audit
						ledger.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						disabled={isDeleting}
						onClick={onClose}
						type='button'
						variant='outline'
					>
						Cancel
					</Button>
					<Button
						disabled={isDeleting}
						onClick={() => void onConfirm()}
						type='button'
						variant='destructive'
					>
						{isDeleting ? "Deleting..." : "Confirm Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
