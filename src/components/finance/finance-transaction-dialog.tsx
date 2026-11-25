// apps/web/src/components/finance/FinanceTransactionDialog.tsx

import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaterialIcon } from '@/components/ui/material-icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveClinicId } from '@/hooks/use-active-clinic';
import { useCreateLedgerEntry } from '@/hooks/use-finance';
import {
  EXPENSE_CATEGORY_OPTIONS,
  REVENUE_CATEGORY_OPTIONS,
} from '@/lib/web/finance-constants';
import { useFinanceStore } from '@/lib/web/finance-store';

export function egpToCents(amountEgp: string): number {
  const normalized = Number(Number(amountEgp).toFixed(2));

  return Math.round((normalized + Number.EPSILON) * 100);
}

const transactionFormSchema = z.object({
  kind: z.enum(['revenue', 'expense']),
  category: z.string().min(1, 'Category is required'),
  amountEgp: z
    .string()
    .refine(
      (val) => !Number.isNaN(Number(val)) && Number(val) > 0,
      'Amount must be a positive number',
    ),
  note: z.string().max(200, 'Note too long').optional(),
  occurredAt: z.string().min(1, 'Date is required'),
});

const QUICK_AMOUNTS = [150, 250, 350, 500, 1000];

export function FinanceTransactionDialog() {
  const clinicId = useActiveClinicId();
  const isRecordOpen = useFinanceStore((s) => s.isRecordOpen);
  const recordKind = useFinanceStore((s) => s.recordKind);
  const closeRecordModal = useFinanceStore((s) => s.closeRecordModal);

  const createEntryMutation = useCreateLedgerEntry();

  const [prevRecordKind, setPrevRecordKind] = useState(recordKind);

  const [activeKind, setActiveKind] = useState<'revenue' | 'expense'>(
    recordKind,
  );

  const [defaultOccurredAt, setDefaultOccurredAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );

  if (prevRecordKind !== recordKind) {
    setPrevRecordKind(recordKind);
    setActiveKind(recordKind);
  }

  const form = useForm({
    defaultValues: {
      kind: recordKind,
      category: recordKind === 'revenue' ? 'Consultation' : 'Supplies',
      amountEgp: '',
      note: '',
      occurredAt: defaultOccurredAt,
    },
    onSubmit: async ({ value }) => {
      const parsed = transactionFormSchema.safeParse(value);

      if (!parsed.success) {
        return;
      }

      const amountCents = egpToCents(value.amountEgp);

      if (amountCents <= 0) {
        return;
      }

      const occurredAtDate =
        value.occurredAt === '' ? new Date() : new Date(value.occurredAt);

      const trimmedNote = value.note.trim();

      await createEntryMutation.mutateAsync({
        clinicId,
        kind: activeKind,
        category: value.category,
        amountCents,
        note: trimmedNote === '' ? undefined : trimmedNote,
        occurredAt: occurredAtDate,
      });

      form.reset();
      closeRecordModal();
    },
  });

  const handleKindSwitch = (newKind: 'revenue' | 'expense') => {
    setActiveKind(newKind);
    form.setFieldValue('kind', newKind);
    form.setFieldValue(
      'category',
      newKind === 'revenue' ? 'Consultation' : 'Supplies',
    );
  };

  const categoryOptions =
    activeKind === 'revenue'
      ? REVENUE_CATEGORY_OPTIONS
      : EXPENSE_CATEGORY_OPTIONS;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          setDefaultOccurredAt(new Date().toISOString().slice(0, 16));
        } else {
          closeRecordModal();
          form.reset();
        }
      }}
      open={isRecordOpen}
    >
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${
                activeKind === 'revenue'
                  ? 'bg-brand-success/15 text-brand-success'
                  : 'bg-destructive/15 text-destructive'
              }`}
            >
              <MaterialIcon
                name={activeKind === 'revenue' ? 'payments' : 'receipt_long'}
              />
            </div>
            <div>
              <DialogTitle>
                {activeKind === 'revenue'
                  ? 'Record Revenue (تسجيل إيراد)'
                  : 'Record Expense (تسجيل مصروف)'}
              </DialogTitle>
              <DialogDescription>
                Log a consultation charge, vaccination fee, or clinic operating
                cost
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1">
          <button
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeKind === 'revenue'
                ? 'bg-card text-brand-success shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleKindSwitch('revenue')}
            type="button"
          >
            <span className="inline-flex text-base text-brand-success">
              <MaterialIcon name="arrow_upward" />
            </span>
            Revenue (إيرادات)
          </button>
          <button
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeKind === 'expense'
                ? 'bg-card text-destructive shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleKindSwitch('expense')}
            type="button"
          >
            <span className="inline-flex text-base text-destructive">
              <MaterialIcon name="arrow_downward" />
            </span>
            Expense (مصروفات)
          </button>
        </div>

        <form
          className="space-y-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit().catch(() => null);
          }}
        >
          <form.Field name="category">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="category">Category (التصنيف) *</Label>
                <Select
                  onValueChange={(v) => {
                    if (v !== '') {
                      field.handleChange(v);
                    }
                  }}
                  value={field.state.value}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Field name="amountEgp">
            {(field) => (
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="amountEgp">
                    Amount in EGP (المبلغ بالجنيه المصري) *
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Egyptian Pounds
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="shrink-0 font-mono text-xs font-bold text-muted-foreground">
                    EGP
                  </span>
                  <Input
                    id="amountEgp"
                    min="0.01"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. 350"
                    required
                    step="0.01"
                    type="number"
                    value={field.state.value}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Presets:
                  </span>
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10"
                      key={amt}
                      onClick={() => field.handleChange(String(amt))}
                      type="button"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form.Field>

          <form.Field name="occurredAt">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="occurredAt">
                  Date &amp; Time (التاريخ والوقت) *
                </Label>
                <Input
                  id="occurredAt"
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                  type="datetime-local"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="note">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="note">
                  Description / Patient MRN / Receipt Note (بيان الإيصال)
                </Label>
                <Input
                  id="note"
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Patient MRN-2026-001 initial consult, receipt #402"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <DialogFooter>
            <Button
              disabled={createEntryMutation.isPending}
              onClick={() => {
                closeRecordModal();
                form.reset();
              }}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  disabled={
                    !canSubmit || isSubmitting || createEntryMutation.isPending
                  }
                  type="submit"
                  variant={activeKind === 'revenue' ? 'default' : 'destructive'}
                >
                  {createEntryMutation.isPending || isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <span>
                      {activeKind === 'revenue'
                        ? 'Record Revenue (تسجيل)'
                        : 'Record Expense (تسجيل)'}
                    </span>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
