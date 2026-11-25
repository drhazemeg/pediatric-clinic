// apps/web/src/components/PageGuide.tsx

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { useAppMode } from "@/lib/web/app-mode";

export interface GuideItem {
	icon: string;
	title: string;
	desc: string;
	titleAr?: string;
	titleEn?: string;
	descAr?: string;
	descEn?: string;
}

interface PageGuideProps {
	items: GuideItem[];
	title?: string;
	titleAr?: string;
	titleEn?: string;
}

export function PageGuide({
	items,
	title,
	titleAr = "دليل الاستخدام السريع",
	titleEn = "Quick Clinic Guide"
}: PageGuideProps) {
	const [open, setOpen] = useState(false);
	const { locale } = useAppMode();
	const isAr = locale === "ar";

	const headingText = title ?? (isAr ? titleAr : titleEn);
	const toggleHint = open
		? isAr
			? "إخفاء الدليل / Hide guide"
			: "Hide guide / إخفاء الدليل"
		: isAr
			? `اضغط لعرض ${items.length} إرشادات / View ${items.length} tips`
			: `Click to view ${items.length} tips / عرض ${items.length} إرشادات`;

	return (
		<Card className='mb-8 overflow-hidden rounded-[var(--radius-xl)] border-2 border-[var(--slushie-500)]/30 bg-[var(--pure-white)]'>
			<button
				className='flex w-full cursor-pointer items-center justify-between p-4 transition-colors hover:bg-[var(--oat-light)] md:p-5'
				onClick={() => setOpen(prev => !prev)}
				type='button'
			>
				<div className='flex items-center gap-3'>
					<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--slushie-500)]/20'>
						<MaterialIcon
							className='text-lg text-[var(--slushie-800)]'
							name='help'
						/>
					</div>
					<div className='text-start'>
						<h3 className='font-headline font-bold text-[var(--clay-black)]'>
							{headingText}
						</h3>
						<p className='text-xs text-[var(--warm-charcoal)]'>{toggleHint}</p>
					</div>
				</div>
				<MaterialIcon
					className='text-xl text-[var(--warm-charcoal)]'
					name={open ? "expand_less" : "expand_more"}
				/>
			</button>

			{open && (
				<div className='space-y-3 border-t border-[var(--oat-border)] px-4 pt-4 pb-5 md:px-5'>
					{items.map(item => {
						const itemTitle = isAr
							? (item.titleAr ?? item.title)
							: (item.titleEn ?? item.title);
						const itemDesc = isAr
							? (item.descAr ?? item.desc)
							: (item.descEn ?? item.desc);

						return (
							<div
								className='flex items-start gap-3 rounded-[var(--radius-lg)] bg-[var(--oat-light)] p-3'
								key={item.title}
							>
								<div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--pure-white)] shadow-sm'>
									<MaterialIcon
										className='text-sm text-[var(--matcha-600)]'
										name={item.icon}
									/>
								</div>
								<div className='min-w-0 flex-1 text-start'>
									<p className='text-sm font-bold text-[var(--clay-black)]'>
										{itemTitle}
									</p>
									<p className='mt-0.5 text-xs leading-relaxed text-[var(--warm-charcoal)]'>
										{itemDesc}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</Card>
	);
}
