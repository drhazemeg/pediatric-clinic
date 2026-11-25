// apps/web/src/components/settings/SecurityInfo.tsx
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export function SecurityInfo() {
	return (
		<div className='max-w-xl'>
			<Card className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardHeader>
					<CardTitle className='font-headline text-[var(--clay-black)]'>
						أمان البيانات والخصوصية / Clinic Data &amp; Key Security
					</CardTitle>
					<CardDescription className='text-[var(--warm-charcoal)]'>
						حماية بيانات العيادة والمفاتيح المشفرة على أجهزة العمل.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--matcha-300)] p-4'>
						<MaterialIcon
							className='text-xl text-[var(--matcha-800)]'
							name='lock'
						/>
						<div>
							<p className='font-medium text-[var(--matcha-800)]'>
								تشفير محلي / Local Encryption
							</p>
							<p className='text-sm text-[var(--matcha-800)]/70'>
								AES-GCM-256 مع تخزين المفتاح في IndexedDB
							</p>
						</div>
					</div>
					<div className='space-y-2 text-xs text-[var(--warm-charcoal)]'>
						<p className='flex items-center gap-2'>
							<MaterialIcon
								className='mt-0.5 shrink-0 text-xs text-[var(--matcha-600)]'
								name='check_circle'
							/>
							عدم إرسال بيانات هوية المرضى إلى خدمات خارجية
						</p>
						<p className='flex items-center gap-2'>
							<MaterialIcon
								className='mt-0.5 shrink-0 text-xs text-[var(--matcha-600)]'
								name='check_circle'
							/>
							تشفير البيانات المحلية في متصفح جهاز العيادة
						</p>
						<p className='flex items-center gap-2'>
							<MaterialIcon
								className='mt-0.5 shrink-0 text-xs text-[var(--matcha-600)]'
								name='check_circle'
							/>
							حفظ مفتاح التشفير محليًا عبر IndexedDB
						</p>
						<p className='flex items-center gap-2'>
							<MaterialIcon
								className='mt-0.5 shrink-0 text-xs text-[var(--matcha-600)]'
								name='check_circle'
							/>
							مسح بيانات الجلسة عند تسجيل الخروج على الأجهزة المشتركة
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
