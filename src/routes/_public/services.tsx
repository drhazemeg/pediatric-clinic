// apps/web/src/routes/_public.services.tsx

import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { CLINIC_BRAND } from "@/lib/web/constants";

export const Route = createFileRoute("/_public/services")({
	head: () => ({
		meta: [
			{
				title: "الخدمات الطبية وخدمات الرضاعة | Pediatric & Lactation Services"
			}
		]
	}),
	component: PublicServicesPage
});

interface DetailedService {
	id: string;
	icon: string;
	titleAr: string;
	titleEn: string;
	subtitleAr: string;
	subtitleEn: string;
	pointsAr: string[];
	pointsEn: string[];
}

const DETAILED_SERVICES: DetailedService[] = [
	{
		id: "newborn",
		icon: "child_care",
		titleAr: "رعاية حديثي الولادة (الشهر الأول)",
		titleEn: "Newborn Care (First Month)",
		subtitleAr: "متابعة آمنة منذ الأيام الأولى بعد الولادة",
		subtitleEn: "Structured early checks after hospital discharge",
		pointsAr: [
			"تقييم وزن الرضيع ومعدلات اكتساب الوزن بعد الفقد الفسيولوجي الأولي",
			"متابعة الصفراء الوليدية والعناية بجذع الحبل السري والختان",
			"توعية الأهل بعلامات الخطر التي تستدعي التقييم الطبي العاجل"
		],
		pointsEn: [
			"Weight trajectory monitoring following initial newborn weight loss",
			"Neonatal jaundice assessment, umbilical cord care, and post-circumcision checks",
			"Clear red-flag guidance for parents during the first four weeks"
		]
	},
	{
		id: "lactation",
		icon: "breastfeeding",
		titleAr: "عيادة الرضاعة الطبيعية المعتمدة (IBCLC)",
		titleEn: "Certified Lactation Support (IBCLC)",
		subtitleAr: "حلول عملية ومبنية على الأدلة للأم والرضيع",
		subtitleEn: "Evidence-based support for mothers and babies",
		pointsAr: [
			"تقييم الالتقام الصحيح ووضعيات الرضاعة المريحة للأم والطفل",
			"دعم إدرار الحليب وتنظيم الرضعات والشفط والتخزين الآمن",
			"علاج احتقان الثدي وتشقق الحلمات أو الشك في قلة الحليب"
		],
		pointsEn: [
			"Latch evaluation and comfortable feeding positions for mother and infant",
			"Milk supply support, feeding pacing, and safe expression/storage guidance",
			"Management of engorgement, nipple discomfort, and low-supply concerns"
		]
	},
	{
		id: "immunizations",
		icon: "vaccines",
		titleAr: "التطعيمات ومتابعة الجداول",
		titleEn: "Immunizations & Catch-Up Plans",
		subtitleAr: "حماية وقائية منظمة للرضع والأطفال",
		subtitleEn: "Organized preventive immunization tracking",
		pointsAr: [
			"متابعة مواعيد التطعيمات الأساسية والاختيارية دون تأخير",
			"وضع جداول تعويضية دقيقة في حال تأخر أي جرعة سابقة",
			"إرشادات خفض الحرارة والراحة بعد التطعيم"
		],
		pointsEn: [
			"Routine and optional vaccine scheduling with clear follow-up dates",
			"Structured catch-up schedules when doses are delayed",
			"Post-vaccination fever and comfort care instructions"
		]
	},
	{
		id: "sick-visits",
		icon: "stethoscope",
		titleAr: "كشف الحالات المرضية الحادة",
		titleEn: "Acute Sick Visits",
		subtitleAr: "فحص سريري دقيق وخطة علاجية آمنة",
		subtitleEn: "Focused clinical assessment and safe dosing",
		pointsAr: [
			"مناظرة حالات الحرارة، الكحة، التهاب الأذن والحلق، والنزلات المعوية",
			"تقييم الجفاف وحالة الترطيب والرضاعة أثناء المرض",
			"حساب الجرعات الدوائية بدقة حسب وزن الطفل وعمره"
		],
		pointsEn: [
			"Evaluation of fever, cough, ear/throat symptoms, and gastroenteritis",
			"Hydration and oral intake assessment during illness",
			"Weight-based dose calculation and allergy cross-checking"
		]
	},
	{
		id: "chronic-care",
		icon: "monitoring",
		titleAr: "الحساسية والمتابعة المزمنة",
		titleEn: "Allergy & Ongoing Follow-Up",
		subtitleAr: "خطة متابعة طويلة المدى لتقليل الانتكاسات",
		subtitleEn: "Longitudinal follow-up to prevent flare-ups",
		pointsAr: [
			"متابعة حالات حساسية البروتين أو الجلد والارتكاريا المتكررة",
			"متابعة نوبات الأزيز الصدري والربو عند الأطفال",
			"إعادة تقييم الحالات المزمنة وتعديل الخطة العلاجية تدريجياً"
		],
		pointsEn: [
			"Follow-up for food/skin allergies and recurrent rashes",
			"Monitoring recurrent wheezing and pediatric asthma control",
			"Scheduled reassessment and step-up/step-down care plans"
		]
	},
	{
		id: "well-child",
		icon: "show_chart",
		titleAr: "فحص النمو والتغذية والتطور",
		titleEn: "Growth, Nutrition & Milestones",
		subtitleAr: "مقارنة دقيقة بمنحنيات النمو ومراحل التطور",
		subtitleEn: "Structured growth curves and milestone checks",
		pointsAr: [
			"رسم ومتابعة الوزن والطول ومحيط الرأس ومؤشر الكتلة على منحنيات WHO والمصرية",
			"إرشادات بدء الطعام التكميلي بعد الشهر السادس وتنوع الوجبات",
			"فحص المهارات الحركية واللغوية والاجتماعية في كل زيارة"
		],
		pointsEn: [
			"Tracking weight, length/height, head circumference, and BMI on WHO & Egyptian charts",
			"Complementary feeding guidance around 6 months and family meal transition",
			"Age-banded review of motor, language, and social developmental milestones"
		]
	}
];

function PublicServicesPage() {
	const search = Route.useSearch();
	const isAr = search.lang === "ar";

	return (
		<div className='mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8'>
			<div className='max-w-3xl space-y-3'>
				<p className='text-primary text-sm font-semibold'>
					{isAr ? CLINIC_BRAND.brandTitleAr : CLINIC_BRAND.brandTitleEn}
				</p>
				<h1 className='text-3xl font-extrabold tracking-tight sm:text-4xl'>
					{isAr
						? "الخدمات الطبية والرضاعة الطبيعية"
						: "Clinical & Lactation Services"}
				</h1>
				<p className='text-muted-foreground text-base leading-relaxed'>
					{isAr
						? "تقدم العيادة رعاية فردية متأنية لكل طفل وأسرة في الغردقة، مع تركيز على الوقاية، الرضاعة الطبيعية، والمتابعة الدقيقة للنمو."
						: "Individualized pediatric and lactation care in Hurghada focused on preventive health, breastfeeding support, and longitudinal growth."}
				</p>
			</div>

			<div className='grid gap-6 md:grid-cols-2'>
				{DETAILED_SERVICES.map(service => (
					<Card
						className='flex flex-col'
						key={service.id}
					>
						<CardHeader>
							<div className='flex items-center gap-3'>
								<span className='bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl'>
									<MaterialIcon name={service.icon} />
								</span>
								<div>
									<CardTitle className='text-lg'>
										{isAr ? service.titleAr : service.titleEn}
									</CardTitle>
									<CardDescription>
										{isAr ? service.subtitleAr : service.subtitleEn}
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className='flex-1'>
							<ul className='text-muted-foreground space-y-2.5 text-sm'>
								{(isAr ? service.pointsAr : service.pointsEn).map(point => (
									<li
										className='flex items-start gap-2'
										key={point}
									>
										<MaterialIcon
											className='text-primary mt-0.5 shrink-0 text-base'
											name='check_circle'
										/>
										<span>{point}</span>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				))}
			</div>

			<div className='bg-muted/40 border-border flex flex-col items-start justify-between gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center'>
				<div>
					<h2 className='text-lg font-bold'>
						{isAr
							? "هل تحتاج إلى حجز موعد أو استفسار قبل الزيارة؟"
							: "Need to Schedule a Visit or Ask a Question?"}
					</h2>
					<p className='text-muted-foreground text-sm'>
						{isAr
							? "تواصل مع العيادة في الغردقة لتحديد الموعد المناسب لحالة طفلك."
							: "Reach out to the clinic in Hurghada for appointment availability and directions."}
					</p>
				</div>
				<Link
					search={{ lang: search.lang }}
					to='/contact'
				>
					<Button size='lg'>
						{isAr ? "الانتقال إلى التواصل والمواعيد" : "Go to Contact & Hours"}
					</Button>
				</Link>
			</div>
		</div>
	);
}
