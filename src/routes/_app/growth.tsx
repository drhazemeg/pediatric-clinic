// apps/web/src/routes/_app/growth.tsx

import type {Indicator} from "@/lib/features/development/index";
import {createFileRoute, redirect} from "@tanstack/react-router";
import {useState} from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {MaterialIcon} from "@/components/ui/MaterialIcon";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {Skeleton} from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {useGrowthCurves} from "@/hooks/use-growth";
import {authClient} from "@/lib/auth-client";
import {growthSearchSchema} from "@/lib/web/route-search-schemas";
import {routeShell} from "@/lib/web/route-shell";

export const Route = createFileRoute("/_app/growth")({
	staticData: routeShell.app,
	validateSearch: growthSearchSchema,
	component: GrowthStandardsComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	}
});

const INDICATOR_LABELS: Record<Indicator, { title: string; unit: string }> = {
	"weight-for-age": {
		title: "Weight-for-Age (الوزن بالنسبة للعمر)",
		unit: "kg"
	},
	"length-for-age": {
		title: "Length/Height-for-Age (الطول بالنسبة للعمر)",
		unit: "cm"
	},
	"weight-for-length": {
		title: "Weight-for-Length (الوزن بالنسبة للطول)",
		unit: "kg"
	},
	"bmi-for-age": {
		title: "BMI-for-Age (مؤشر كتلة الجسم)",
		unit: "kg/m²"
	},
	"head-circumference-for-age": {
		title: "Head Circumference-for-Age (محيط الرأس)",
		unit: "cm"
	}
};

function GrowthStandardsComponent() {
	const search = Route.useSearch();
	const [indicator, setIndicator] = useState<Indicator>(
		(search.indicator as Indicator) ?? "weight-for-age"
	);
	const [sex, setSex] = useState<"male" | "female">(search.sex ?? "male");
	const [maxMonths, setMaxMonths] = useState(search.maxMonths ?? "24");

	const { data: curves, isLoading } = useGrowthCurves(
		indicator,
		sex,
		0,
		Number.parseInt(maxMonths, 10)
	);

	const currentInfo = INDICATOR_LABELS[indicator];

	return (
		<div className='mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8'>
			{/* Header */}
			<div className='mb-6'>
				<div className='flex items-center gap-2'>
					<MaterialIcon
						className='text-2xl text-amber-600'
						name='monitoring'
					/>
					<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
						WHO &amp; Egyptian Pediatric Growth Standards
					</h1>
				</div>
				<p className='mt-1 text-sm text-[var(--warm-charcoal)]/80'>
					Standard reference percentiles (P3, P15, P50, P85, P97) and Z-score
					standard deviations (منحنيات النمو القياسية)
				</p>
			</div>

			{/* Filter Controls */}
			<Card className='mb-6 border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardContent className='p-4'>
					<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
						<div>
							<Label htmlFor='indicatorSelect'>Growth Indicator</Label>
							<Select
								onValueChange={v => v && setIndicator(v as Indicator)}
								value={indicator}
							>
								<SelectTrigger id='indicatorSelect'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='weight-for-age'>
										Weight-for-Age (الوزن بالنسبة للعمر)
									</SelectItem>
									<SelectItem value='length-for-age'>
										Length-for-Age (الطول بالنسبة للعمر)
									</SelectItem>
									<SelectItem value='weight-for-length'>
										Weight-for-Length (الوزن بالنسبة للطول)
									</SelectItem>
									<SelectItem value='head-circumference-for-age'>
										Head Circumference (محيط الرأس)
									</SelectItem>
									<SelectItem value='bmi-for-age'>
										BMI-for-Age (كتلة الجسم)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor='sexSelect'>Sex</Label>
							<Select
								onValueChange={v => v && setSex(v as "male" | "female")}
								value={sex}
							>
								<SelectTrigger id='sexSelect'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='male'>Boys (الأولاد)</SelectItem>
									<SelectItem value='female'>Girls (البنات)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor='ageRange'>Age Range (Months)</Label>
							<Select
								onValueChange={v =>
									(v === "12" || v === "24" || v === "60") && setMaxMonths(v)
								}
								value={maxMonths}
							>
								<SelectTrigger id='ageRange'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='12'>0 to 12 months (Infancy)</SelectItem>
									<SelectItem value='24'>
										0 to 24 months (Toddlerhood)
									</SelectItem>
									<SelectItem value='60'>
										0 to 60 months (Up to 5 years)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Main Standards Data Table */}
			<Card className='mb-8 border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div>
							<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
								{currentInfo.title} &bull; {sex === "male" ? "Boys" : "Girls"}
							</CardTitle>
							<CardDescription>
								WHO Child Growth Standards Reference ({currentInfo.unit})
							</CardDescription>
						</div>
						<span className='rounded bg-[var(--oat-light)] px-2.5 py-1 text-xs font-semibold text-[var(--clay-black)]'>
							Standard LMS Model
						</span>
					</div>
				</CardHeader>
				<CardContent className='p-0'>
					{isLoading ? (
						<div className='space-y-3 p-6'>
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-full' />
						</div>
					) : !curves || curves.points.length === 0 ? (
						<p className='py-8 text-center text-sm text-[var(--warm-charcoal)]/80'>
							No curves available for this selection.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Age (Months)</TableHead>
									<TableHead className='text-red-700'>-3 SD (P0.1)</TableHead>
									<TableHead className='text-amber-700'>-2 SD (P2.3)</TableHead>
									<TableHead className='text-yellow-700'>-1 SD (P15)</TableHead>
									<TableHead className='font-bold text-emerald-800'>
										Median / 0 SD (P50)
									</TableHead>
									<TableHead className='text-yellow-700'>+1 SD (P85)</TableHead>
									<TableHead className='text-amber-700'>
										+2 SD (P97.7)
									</TableHead>
									<TableHead className='text-red-700'>+3 SD (P99.9)</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(curves?.points ?? []).map((row, idx: number) => (
									<TableRow key={row.x ?? idx}>
										<TableCell className='text-xs font-bold text-[var(--clay-black)]'>
											{row.x} mo
										</TableCell>
										<TableCell className='font-mono text-xs text-red-700'>
											{row.sd3neg ?? "-"}
										</TableCell>
										<TableCell className='font-mono text-xs text-amber-700'>
											{row.sd2neg ?? "-"}
										</TableCell>
										<TableCell className='font-mono text-xs text-yellow-800'>
											{row.sd1neg ?? "-"}
										</TableCell>
										<TableCell className='bg-emerald-50/40 font-mono text-xs font-bold text-emerald-800'>
											{row.median ?? "-"}
										</TableCell>
										<TableCell className='font-mono text-xs text-yellow-800'>
											{row.sd1 ?? "-"}
										</TableCell>
										<TableCell className='font-mono text-xs text-amber-700'>
											{row.sd2 ?? "-"}
										</TableCell>
										<TableCell className='font-mono text-xs text-red-700'>
											{row.sd3 ?? "-"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Clinical Cut-off Diagnostic Notes */}
			<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
				<Card className='border-amber-200 bg-amber-50/60'>
					<CardHeader className='pb-2'>
						<CardTitle className='text-sm font-bold text-amber-950'>
							Moderate Undernutrition (MAM)
						</CardTitle>
					</CardHeader>
					<CardContent className='text-xs text-amber-900'>
						Z-score between <strong>-2 SD and -3 SD</strong>. Requires
						nutritional evaluation, counseling on complementary feeding, and
						bi-weekly follow-up.
					</CardContent>
				</Card>

				<Card className='border-red-200 bg-red-50/60'>
					<CardHeader className='pb-2'>
						<CardTitle className='text-sm font-bold text-red-950'>
							Severe Acute Malnutrition (SAM)
						</CardTitle>
					</CardHeader>
					<CardContent className='text-xs text-red-900'>
						Z-score &lt; <strong>-3 SD</strong> or bilateral pitting edema.
						Immediate outpatient RUTF therapy or inpatient referral if
						complications exist.
					</CardContent>
				</Card>

				<Card className='border-blue-200 bg-blue-50/60'>
					<CardHeader className='pb-2'>
						<CardTitle className='text-sm font-bold text-blue-950'>
							Overweight &amp; Obesity
						</CardTitle>
					</CardHeader>
					<CardContent className='text-xs text-blue-900'>
						BMI or weight-for-length &gt; <strong>+2 SD</strong> (overweight) or
						&gt; <strong>+3 SD</strong> (obese). Evaluate sugary drink intake,
						screen for metabolic risk.
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
