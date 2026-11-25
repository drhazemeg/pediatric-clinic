import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface CpnsPageHeaderProps {
	icon: string;
	title: string;
	subtitle: string;
}

export function CpnsPageHeader({ icon, title, subtitle }: CpnsPageHeaderProps) {
	return (
		<div className='mb-6 flex items-center gap-3'>
			<div className='flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--blueberry-800)]'>
				<MaterialIcon
					className='text-lg text-[var(--pure-white)]'
					name={icon}
				/>
			</div>
			<div>
				<h1 className='font-headline text-xl font-bold text-[var(--clay-black)]'>
					{title}
				</h1>
				<p className='text-xs text-[var(--warm-charcoal)]'>{subtitle}</p>
			</div>
		</div>
	);
}
