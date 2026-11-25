import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

function formatDate(d: Date): string {
	return d.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric"
	});
}

interface DatePickerProps {
	value: Date | undefined;
	onChange: (date: Date | undefined) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function DatePicker({
	value,
	onChange,
	placeholder = "Select date",
	className,
	disabled
}: DatePickerProps) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		if (open) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open]);

	return (
		<div
			className={cn("relative", className)}
			ref={ref}
		>
			<button
				className='flex h-10 w-full cursor-pointer items-center gap-2 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] px-3.5 text-left text-sm transition-colors hover:bg-[var(--oat-light)] disabled:cursor-not-allowed disabled:opacity-50'
				disabled={disabled}
				onClick={() => !disabled && setOpen(!open)}
				type='button'
			>
				<svg
					aria-hidden='true'
					className='size-4 shrink-0 fill-current text-[var(--warm-charcoal)]'
					viewBox='0 0 24 24'
				>
					<path d='M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z' />
				</svg>
				<span
					className={
						value ? "text-[var(--clay-black)]" : "text-[var(--warm-silver)]"
					}
				>
					{value ? formatDate(value) : placeholder}
				</span>
				{value && (
					<button
						aria-label='Clear date'
						className='ml-auto cursor-pointer text-[var(--warm-silver)] hover:text-[var(--clay-black)]'
						onClick={e => {
							e.stopPropagation();
							onChange(undefined);
						}}
						type='button'
					>
						<svg
							aria-hidden='true'
							className='size-3.5 fill-current'
							viewBox='0 0 24 24'
						>
							<path d='M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' />
						</svg>
					</button>
				)}
			</button>

			{open && (
				<div className='clay-shadow absolute top-full left-0 z-50 mt-1 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] p-2'>
					<DayPicker
						className='rdp-custom'
						mode='single'
						onSelect={d => {
							onChange(d);
							setOpen(false);
						}}
						selected={value}
					/>
				</div>
			)}
		</div>
	);
}
