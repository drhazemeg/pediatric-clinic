// apps/web/src/components/settings/TipsCard.tsx
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export function TipsCard() {
	return (
		<Card className='clay-shadow sticky top-8 rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'>
			<CardHeader>
				<CardTitle className='font-headline text-[var(--clay-black)]'>
					إرشادات تشغيل العيادة / Clinic Tips
				</CardTitle>
				<CardDescription className='text-[var(--warm-charcoal)]'>
					ملاحظات سريعة لإدارة الإعدادات والذكاء الإكلينيكي.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='space-y-2 text-xs text-[var(--warm-charcoal)]'>
					<p className='flex items-start gap-2'>
						<MaterialIcon
							className='mt-0.5 shrink-0 text-xs text-[var(--matcha-600)]'
							name='check_circle'
						/>
						مراجعة الطبيب إلزامية لكل مسودة SOAP أو حساب جرعة أو إرشادات أهل
					</p>
					<p className='flex items-start gap-2'>
						<MaterialIcon
							className='mt-0.5 shrink-0 text-xs text-[var(--matcha-600)]'
							name='check_circle'
						/>
						التحقق من وزن الطفل بالكيلوجرام وعمر الحمل قبل اعتماد الجرعات
					</p>
					<p className='flex items-start gap-2'>
						<MaterialIcon
							className='mt-0.5 shrink-0 text-xs text-[var(--matcha-600)]'
							name='check_circle'
						/>
						تأمين المفاتيح محليًا عبر IndexedDB دون تخزينها بشكل مكشوف
					</p>
					<p className='flex items-start gap-2'>
						<MaterialIcon
							className='mt-0.5 shrink-0 text-xs text-[var(--matcha-600)]'
							name='check_circle'
						/>
						يمكن حفظ أكثر من إعداد مزود للذكاء الاصطناعي والتبديل بينها
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
