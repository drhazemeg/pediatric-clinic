// apps/web/src/components/finance/FinanceTransactionDialog.tsx

import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { useActiveClinicId } from "@/hooks/use-active-clinic";
import { useCreateLedgerEntry } from "@/hooks/use-finance";
import {
	EXPENSE_CATEGORY_OPTIONS,
	REVENUE_CATEGORY_OPTIONS
} from "@/lib/web/finance-constants";
import { useFinanceStore } from "@/lib/web/finance-store";

const transactionFormSchema = z.object({
	kind: z.enum(["revenue", "expense"]),
	category: z.string().min(1, "Category is required"),
	amountEgp: z
		.string()
		.refine(
			val =>
				!Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) > 0,
			"Amount must be a positive number"
		),
	note: z.string().max(200, "Note too long").optional(),
	occurredAt: z.string().min(1, "Date is required")
});

const QUICK_AMOUNTS = [150, 250, 350, 500, 1000];

export function egpToCents(amountEgp: string): number {
	const normalized = Number(Number.parseFloat(amountEgp).toFixed(2));
	return Math.round((normalized + Number.EPSILON) * 100);
}

export function FinanceTransactionDialog() {
	const clinicId = useActiveClinicId();
	const isRecordOpen = useFinanceStore(s => s.isRecordOpen);
	const recordKind = useFinanceStore(s => s.recordKind);
	const closeRecordModal = useFinanceStore(s => s.closeRecordModal);

	const createEntryMutation = useCreateLedgerEntry();
	const [activeKind, setActiveKind] = useState<"revenue" | "expense">(
		recordKind
	);

	useEffect(() => {
		setActiveKind(recordKind);
	}, [recordKind]);

	const nowIso = new Date().toISOString().slice(0, 16);

	const form = useForm({
		defaultValues: {
			kind: recordKind,
			category: recordKind === "revenue" ? "Consultation" : "Supplies",
			amountEgp: "",
			note: "",
			occurredAt: nowIso
		},
		onSubmit: async ({ value }) => {
			const parsed = transactionFormSchema.safeParse(value);
			if (!parsed.success) return;

			const amountCents = egpToCents(value.amountEgp);
			if (amountCents <= 0) return;

			const occurredAtDate = value.occurredAt
				? new Date(value.occurredAt)
				: new Date();

			await createEntryMutation.mutateAsync({
				clinicId,
				kind: value.kind,
				category: value.category,
				amountCents,
				note: value.note?.trim() || undefined,
				occurredAt: occurredAtDate
			});

			form.reset();
			closeRecordModal();
		}
	});

	const handleKindSwitch = (newKind: "revenue" | "expense") => {
		setActiveKind(newKind);
		form.setFieldValue("kind", newKind);
		form.setFieldValue(
			"category",
			newKind === "revenue" ? "Consultation" : "Supplies"
		);
	};

	const categoryOptions =
		activeKind === "revenue"
			? REVENUE_CATEGORY_OPTIONS
			: EXPENSE_CATEGORY_OPTIONS;

	return (
		<Dialog
			onOpenChange={open => {
				if (!open) {
					closeRecordModal();
					form.reset();
				}
			}}
			open={isRecordOpen}
		>
			<DialogContent className='max-w-lg bg-[var(--pure-white)]'>
				<DialogHeader>
					<div className='flex items-center gap-2'>
						<div
							className={`flex h-10 w-10 items-center justify-center rounded-full ${
								activeKind === "revenue"
									? "bg-emerald-100 text-emerald-700"
									: "bg-red-100 text-red-700"
							}`}
						>
							<MaterialIcon
								className='text-xl'
								name={activeKind === "revenue" ? "payments" : "receipt_long"}
							/>
						</div>
						<div>
							<DialogTitle className='text-lg font-bold text-[var(--clay-black)]'>
								{activeKind === "revenue"
									? "Record Revenue (تسجيل إيراد)"
									: "Record Expense (تسجيل مصروف)"}
							</DialogTitle>
							<DialogDescription className='text-xs text-[var(--warm-charcoal)]/80'>
								Log a consultation charge, vaccination fee, or clinic operating
								cost
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className='grid grid-cols-2 gap-2 rounded-xl border border-[var(--oat-border)] bg-[var(--oat-border)]/20 p-1'>
					<button
						className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
							activeKind === "revenue"
								? "bg-[var(--pure-white)] text-emerald-800 shadow-sm"
								: "text-[var(--warm-charcoal)] hover:text-[var(--clay-black)]"
						}`}
						onClick={() => handleKindSwitch("revenue")}
						type='button'
					>
						<MaterialIcon
							className='text-base text-emerald-600'
							name='arrow_upward'
						/>
						Revenue (إيرادات)
					</button>
					<button
						className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
							activeKind === "expense"
								? "bg-[var(--pure-white)] text-red-800 shadow-sm"
								: "text-[var(--warm-charcoal)] hover:text-[var(--clay-black)]"
						}`}
						onClick={() => handleKindSwitch("expense")}
						type='button'
					>
						<MaterialIcon
							className='text-base text-red-600'
							name='arrow_downward'
						/>
						Expense (مصروفات)
					</button>
				</div>

				<form
					className='space-y-4 py-2'
					onSubmit={e => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<form.Field name='category'>
						{field => (
							<div>
								<Label
									className='text-xs font-semibold'
									htmlFor='category'
								>
									Category (التصنيف) *
								</Label>
								<Select
									onValueChange={v => v && field.handleChange(v)}
									value={field.state.value}
								>
									<SelectTrigger
										className='mt-1 bg-[var(--pure-white)]'
										id='category'
									>
										<SelectValue placeholder='Select category' />
									</SelectTrigger>
									<SelectContent>
										{categoryOptions.map(opt => (
											<SelectItem
												key={opt.value}
												value={opt.value}
											>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</form.Field>

					<form.Field name='amountEgp'>
						{field => (
							<div>
								<div className='flex items-center justify-between'>
									<Label
										className='text-xs font-semibold'
										htmlFor='amountEgp'
									>
										Amount in EGP (المبلغ بالجنيه المصري) *
									</Label>
									<span className='text-[11px] text-[var(--warm-charcoal)]/70'>
										Egyptian Pounds
									</span>
								</div>
								<div className='relative mt-1'>
									<span className='absolute top-1/2 left-3 -translate-y-1/2 font-mono text-xs font-bold text-[var(--warm-charcoal)]'>
										EGP
									</span>
									<Input
										className='bg-[var(--pure-white)] pl-12 font-mono text-base font-bold'
										id='amountEgp'
										min='0.01'
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										placeholder='e.g. 350'
										required
										step='0.01'
										type='number'
										value={field.state.value}
									/>
								</div>

								<div className='mt-2 flex flex-wrap items-center gap-1.5'>
									<span className='text-[10px] text-[var(--warm-charcoal)]/60'>
										Presets:
									</span>
									{QUICK_AMOUNTS.map(amt => (
										<button
											className='rounded-md border border-[var(--oat-border)] bg-[var(--pure-white)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--clay-black)] transition-colors hover:border-[var(--matcha-600)] hover:bg-[var(--matcha-50)]'
											key={amt}
											onClick={() => field.handleChange(String(amt))}
											type='button'
										>
											{amt}
										</button>
									))}
								</div>
							</div>
						)}
					</form.Field>

					<form.Field name='occurredAt'>
						{field => (
							<div>
								<Label
									className='text-xs font-semibold'
									htmlFor='occurredAt'
								>
									Date &amp; Time (التاريخ والوقت) *
								</Label>
								<Input
									className='mt-1 bg-[var(--pure-white)] text-xs'
									id='occurredAt'
									onBlur={field.handleBlur}
									onChange={e => field.handleChange(e.target.value)}
									required
									type='datetime-local'
									value={field.state.value}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name='note'>
						{field => (
							<div>
								<Label
									className='text-xs font-semibold'
									htmlFor='note'
								>
									Description / Patient MRN / Receipt Note (بيان الإيصال)
								</Label>
								<Input
									className='mt-1 bg-[var(--pure-white)] text-xs'
									id='note'
									onBlur={field.handleBlur}
									onChange={e => field.handleChange(e.target.value)}
									placeholder='e.g. Patient MRN-2026-001 initial consult, receipt #402'
									value={field.state.value ?? ""}
								/>
							</div>
						)}
					</form.Field>

					<DialogFooter className='pt-2'>
						<Button
							disabled={createEntryMutation.isPending}
							onClick={() => {
								closeRecordModal();
								form.reset();
							}}
							type='button'
							variant='outline'
						>
							Cancel
						</Button>
						<form.Subscribe selector={s => [s.canSubmit, s.isSubmitting]}>
							{([canSubmit, isSubmitting]) => (
								<Button
									className={
										activeKind === "revenue"
											? "bg-emerald-600 text-white hover:bg-emerald-700"
											: "bg-red-600 text-white hover:bg-red-700"
									}
									disabled={
										!canSubmit || isSubmitting || createEntryMutation.isPending
									}
									type='submit'
								>
									{createEntryMutation.isPending || isSubmitting ? (
										<span>Saving...</span>
									) : (
										<span>
											{activeKind === "revenue"
												? "Record Revenue (تسجيل)"
												: "Record Expense (تسجيل)"}
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
