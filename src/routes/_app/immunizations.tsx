// apps/web/src/routes/immunizations.tsx

import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveClinicId } from "@/hooks/use-active-clinic";
import { useImmunizationMatrix } from "@/hooks/use-immunizations";
import { authClient } from "@/lib/auth-client";
import { immunizationsSearchSchema } from "@/lib/web/route-search-schemas";
import { routeShell } from "@/lib/web/route-shell";

export const Route = createFileRoute("/_app/immunizations")({
	staticData: routeShell.app,
	validateSearch: immunizationsSearchSchema,
	component: ImmunizationsComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	}
});

const EGYPT_ROUTINE_SCHEDULE = [
	{
		age: "At Birth (خلال أول 24 ساعة)",
		vaccines: [
			{
				name: "BCG",
				disease: "Tuberculosis (الدرن)",
				route: "Intradermal (كتف أيسر)"
			},
			{
				name: "HepB (Zero dose)",
				disease: "Hepatitis B (التهاب الكبد ب)",
				route: "Intramuscular (فخذ أيمن)"
			}
		]
	},
	{
		age: "2 Months (شهرين)",
		vaccines: [
			{
				name: "Sabin (OPV 1)",
				disease: "Poliomyelitis (شلل الأطفال الفموي)",
				route: "Oral (نقطتان بالفم)"
			},
			{
				name: "IPV 1",
				disease: "Inactivated Polio (شلل الأطفال بالحقن)",
				route: "Intramuscular"
			},
			{
				name: "Pentavalent 1",
				disease:
					"DTP + HepB + Hib (الخماسي: الدفتيريا، التيتانوس، السعال الديكي، الكبد ب، الإنفلونزا البكتيرية)",
				route: "Intramuscular"
			}
		]
	},
	{
		age: "4 Months (4 أشهر)",
		vaccines: [
			{ name: "Sabin (OPV 2)", disease: "Poliomyelitis", route: "Oral" },
			{ name: "IPV 2", disease: "Inactivated Polio", route: "Intramuscular" },
			{
				name: "Pentavalent 2",
				disease: "DTP + HepB + Hib",
				route: "Intramuscular"
			}
		]
	},
	{
		age: "6 Months (6 أشهر)",
		vaccines: [
			{ name: "Sabin (OPV 3)", disease: "Poliomyelitis", route: "Oral" },
			{
				name: "Pentavalent 3",
				disease: "DTP + HepB + Hib",
				route: "Intramuscular"
			}
		]
	},
	{
		age: "9 Months (9 أشهر)",
		vaccines: [
			{ name: "Sabin (OPV 4)", disease: "Poliomyelitis", route: "Oral" },
			{
				name: "Vitamin A (100,000 IU)",
				disease: "Vitamin A supplement (كبسولة فيتامين أ الزرقاء)",
				route: "Oral"
			}
		]
	},
	{
		age: "12 Months (سنة)",
		vaccines: [
			{
				name: "MMR 1",
				disease: "Measles, Mumps, Rubella (الحصبة، النكاف، الحصبة الألمانية)",
				route: "Subcutaneous (كتف أيمن)"
			},
			{ name: "Sabin (OPV 5)", disease: "Poliomyelitis", route: "Oral" }
		]
	},
	{
		age: "18 Months (سنة ونصف)",
		vaccines: [
			{
				name: "DTP Booster",
				disease: "Diphtheria, Tetanus, Pertussis (الثلاثي البكتيري)",
				route: "Intramuscular"
			},
			{
				name: "MMR 2 (Booster)",
				disease: "Measles, Mumps, Rubella",
				route: "Subcutaneous"
			},
			{ name: "Sabin (Booster)", disease: "Poliomyelitis", route: "Oral" },
			{
				name: "Vitamin A (200,000 IU)",
				disease: "Vitamin A (كبسولتان حمراوان)",
				route: "Oral"
			}
		]
	}
];

function ImmunizationsComponent() {
	const clinicId = useActiveClinicId();
	const [onlyOverdue, setOnlyOverdue] = useState(false);

	// Queries
	const { data: matrixData, isLoading: isMatrixLoading } =
		useImmunizationMatrix(clinicId, { onlyOverdue });

	return (
		<div className='mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8'>
			{/* Header */}
			<div className='mb-6'>
				<div className='flex items-center gap-2'>
					<MaterialIcon
						className='text-2xl text-indigo-600'
						name='vaccines'
					/>
					<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
						Egyptian Routine Immunization Schedule &amp; Clinic Tracker
					</h1>
				</div>
				<p className='mt-1 text-sm text-[var(--warm-charcoal)]/80'>
					Ministry of Health mandatory vaccination schedule, coverage tracking,
					and overdue recall (الجدول الوطني للتطعيمات)
				</p>
			</div>

			<Tabs
				className='space-y-6'
				defaultValue='schedule'
			>
				<TabsList className='border-b border-[var(--oat-border)] bg-transparent p-0'>
					<TabsTrigger
						className='data-[state=active]:border-b-2 data-[state=active]:border-[var(--matcha-600)] data-[state=active]:text-[var(--matcha-800)]'
						value='schedule'
					>
						<MaterialIcon
							className='mr-1.5 text-base'
							name='calendar_today'
						/>
						<span>National MOH Schedule (جدول التطعيمات)</span>
					</TabsTrigger>
					<TabsTrigger
						className='data-[state=active]:border-b-2 data-[state=active]:border-[var(--matcha-600)] data-[state=active]:text-[var(--matcha-800)]'
						value='matrix'
					>
						<MaterialIcon
							className='mr-1.5 text-base'
							name='group'
						/>
						<span>Clinic Coverage Matrix &amp; Overdue Recall</span>
					</TabsTrigger>
				</TabsList>

				{/* Tab 1: MOH Schedule */}
				<TabsContent
					className='space-y-6'
					value='schedule'
				>
					<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
						{EGYPT_ROUTINE_SCHEDULE.map(tier => (
							<Card
								className='border-[var(--oat-border)] bg-[var(--pure-white)]'
								key={tier.age}
							>
								<CardHeader className='pb-3'>
									<div className='flex items-center justify-between'>
										<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
											{tier.age}
										</CardTitle>
										<span className='rounded bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700'>
											{tier.vaccines.length} doses
										</span>
									</div>
								</CardHeader>
								<CardContent className='divide-y divide-[var(--oat-border)] p-0 px-6 pb-4'>
									{tier.vaccines.map(v => (
										<div
											className='py-2.5'
											key={v.name}
										>
											<div className='flex items-center justify-between'>
												<span className='text-sm font-bold text-[var(--clay-black)]'>
													{v.name}
												</span>
												<span className='text-xs text-[var(--warm-charcoal)]/80'>
													{v.route}
												</span>
											</div>
											<p className='mt-0.5 text-xs text-[var(--warm-charcoal)]'>
												Target: {v.disease}
											</p>
										</div>
									))}
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>

				{/* Tab 2: Coverage Matrix */}
				<TabsContent
					className='space-y-4'
					value='matrix'
				>
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader className='flex flex-row items-center justify-between pb-3'>
							<div>
								<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
									Registered Patients Immunization Status
								</CardTitle>
								<CardDescription>
									Track compliance with mandatory vaccines and identify overdue
									children
								</CardDescription>
							</div>

							<div className='flex items-center gap-2'>
								<Button
									className={`text-xs ${onlyOverdue ? "bg-amber-600 text-white" : ""}`}
									onClick={() => setOnlyOverdue(!onlyOverdue)}
									size='sm'
									type='button'
									variant={onlyOverdue ? "default" : "outline"}
								>
									<MaterialIcon
										className='mr-1 text-xs'
										name='warning'
									/>
									<span>Only Overdue ({onlyOverdue ? "ON" : "OFF"})</span>
								</Button>
							</div>
						</CardHeader>
						<CardContent className='p-0'>
							{isMatrixLoading ? (
								<div className='space-y-3 p-6'>
									<Skeleton className='h-10 w-full' />
									<Skeleton className='h-10 w-full' />
								</div>
							) : (matrixData?.rows ?? []).length === 0 ? (
								<p className='py-8 text-center text-sm text-[var(--warm-charcoal)]/80'>
									No overdue children recorded.
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Child Name</TableHead>
											<TableHead>MRN</TableHead>
											<TableHead>DOB</TableHead>
											<TableHead className='text-end'>Action</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{(matrixData?.rows ?? []).map(row => (
											<TableRow key={row.patientId}>
												<TableCell className='text-xs font-bold text-[var(--clay-black)]'>
													{row.firstName} {row.lastName}
												</TableCell>
												<TableCell className='font-mono text-xs text-[var(--warm-charcoal)]'>
													{row.mrn || "-"}
												</TableCell>
												<TableCell className='text-xs text-[var(--warm-charcoal)]'>
													{row.dateOfBirth}
												</TableCell>
												<TableCell className='text-end'>
													<Link
														params={{ patientId: row.patientId }}
														to='/patients/$patientId'
													>
														<Button
															size='sm'
															type='button'
															variant='outline'
														>
															View Chart
														</Button>
													</Link>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
