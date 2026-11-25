// apps/web/src/routes/prescriptions.tsx

import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@/components/ui/table";
import { useFormularySearch } from "@/hooks/use-prescriptions";
import { authClient } from "@/lib/auth-client";
import { prescriptionsSearchSchema } from "@/lib/web/route-search-schemas";
import { routeShell } from "@/lib/web/route-shell";

export const Route = createFileRoute("/_app/prescriptions")({
	staticData: routeShell.app,
	validateSearch: prescriptionsSearchSchema,
	component: PrescriptionsComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	}
});

// Egyptian common pediatric quick-reference drugs
const QUICK_FORMULARY = [
	{
		name: "Paracetamol",
		tradeNames: "Cetal, Paramol, Tempra",
		pediatricDose: "10 - 15 mg/kg/dose",
		freq: "Every 4-6 hours (max 4 doses/24h)",
		maxDaily: "60 mg/kg/day (max 2000mg/day)",
		concentration: "250 mg / 5 mL (Syrup) or 100 mg / 1 mL (Drops)",
		note: "First-line antipyretic/analgesic for all ages including neonates."
	},
	{
		name: "Ibuprofen",
		tradeNames: "Brufen, Megafen, Marcofen",
		pediatricDose: "5 - 10 mg/kg/dose",
		freq: "Every 6-8 hours",
		maxDaily: "40 mg/kg/day",
		concentration: "100 mg / 5 mL",
		note: "Caution: Do not use in infants < 3 months or dehydrated patients."
	},
	{
		name: "Amoxicillin",
		tradeNames: "E-Mox, Biomox, Amoxil",
		pediatricDose: "40 - 90 mg/kg/day",
		freq: "Divided every 8 hours or 12 hours",
		maxDaily: "1000 mg/day for mild-mod; 2000-3000 mg/day for severe AOM",
		concentration: "250 mg / 5 mL, 500 mg / 5 mL",
		note: "First-line for Acute Otitis Media & Community Acquired Pneumonia."
	},
	{
		name: "Amoxicillin / Clavulanate",
		tradeNames: "Augmentin, Megamox, Curam, Hibiotic",
		pediatricDose: "45 - 90 mg/kg/day (based on amoxicillin component)",
		freq: "Divided every 12 hours",
		maxDaily: "4000 mg amoxicillin/day",
		concentration: "312.5 mg / 5 mL, 457 mg / 5 mL, 642.9 mg / 5 mL ES",
		note: "Take with food to minimize GI intolerance and diarrhea."
	},
	{
		name: "Azithromycin",
		tradeNames: "Zithrokan, Xithrone, Zithromax",
		pediatricDose: "10 mg/kg/day on Day 1, then 5 mg/kg/day Days 2-5",
		freq: "Once daily (OD)",
		maxDaily: "500 mg Day 1, 250 mg Days 2-5",
		concentration: "200 mg / 5 mL",
		note: "Atypical pneumonia, pertussis, or penicillin-allergic patients."
	},
	{
		name: "Ondansetron",
		tradeNames: "Danset, Zofran",
		pediatricDose: "0.15 mg/kg/dose (or 2mg for 8-15kg, 4mg for >15kg)",
		freq: "Single dose for acute gastroenteritis vomiting",
		maxDaily: "8 mg/dose",
		concentration: "4 mg / 5 mL",
		note: "Single oral dose facilitates oral rehydration therapy in acute GE."
	}
];

function PrescriptionsComponent() {
	const [searchQuery, setSearchQuery] = useState("");

	// Formulary Queries
	const { data: formularyResults, isLoading: isSearchLoading } =
		useFormularySearch(searchQuery);

	// Calculator State
	const [patientWeightKg, setPatientWeightKg] = useState("10");
	const [targetMgPerKg, setTargetMgPerKg] = useState("15");
	const [drugConcentrationMg, setDrugConcentrationMg] = useState("250");
	const [drugVolumeMl, setDrugVolumeMl] = useState("5");

	// Calculations
	const calculatedDoseMg = useMemo(() => {
		const weight = Number.parseFloat(patientWeightKg);
		const mgPerKg = Number.parseFloat(targetMgPerKg);
		if (Number.isNaN(weight) || Number.isNaN(mgPerKg) || weight <= 0) return 0;
		return Math.round(weight * mgPerKg * 10) / 10;
	}, [patientWeightKg, targetMgPerKg]);

	const calculatedVolumeMl = useMemo(() => {
		const mg = calculatedDoseMg;
		const concMg = Number.parseFloat(drugConcentrationMg);
		const volMl = Number.parseFloat(drugVolumeMl);
		if (
			mg <= 0 ||
			Number.isNaN(concMg) ||
			Number.isNaN(volMl) ||
			concMg <= 0 ||
			volMl <= 0
		)
			return 0;
		return Math.round(((mg * volMl) / concMg) * 10) / 10;
	}, [calculatedDoseMg, drugConcentrationMg, drugVolumeMl]);

	return (
		<div className='mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8'>
			{/* Header */}
			<div className='mb-6'>
				<div className='flex items-center gap-2'>
					<MaterialIcon
						className='text-2xl text-emerald-600'
						name='medication'
					/>
					<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
						Egyptian National Formulary &amp; Pediatric Dose Calculator
					</h1>
				</div>
				<p className='mt-1 text-sm text-[var(--warm-charcoal)]/80'>
					Weight-adjusted pediatric dosing, volume conversions, and safety
					guardrails (دليل الأدوية وحاسبة الجرعات)
				</p>
			</div>

			<div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
				{/* 2 Cols: Interactive Dose Calculator & Formulary Search */}
				<div className='space-y-6 lg:col-span-2'>
					{/* Interactive Weight-Based Dose Calculator */}
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader className='pb-3'>
							<div className='flex items-center gap-2'>
								<MaterialIcon
									className='text-emerald-600'
									name='calculate'
								/>
								<CardTitle className='text-lg font-bold text-[var(--clay-black)]'>
									Weight-Based Pediatric Dose Calculator
								</CardTitle>
							</div>
							<CardDescription>
								Computes exact target dose in milligrams and liquid syrup volume
								in milliliters.
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-6'>
							<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
								<div>
									<Label htmlFor='calcWeight'>
										Patient Current Weight (كجم) *
									</Label>
									<Input
										id='calcWeight'
										max='120'
										min='0.3'
										onChange={e => setPatientWeightKg(e.target.value)}
										placeholder='e.g. 8.5'
										step='0.1'
										type='number'
										value={patientWeightKg}
									/>
								</div>

								<div>
									<Label htmlFor='targetDose'>
										Target Dose per kg (mg/kg/dose) *
									</Label>
									<Input
										id='targetDose'
										onChange={e => setTargetMgPerKg(e.target.value)}
										placeholder='e.g. 15'
										step='0.5'
										type='number'
										value={targetMgPerKg}
									/>
								</div>
							</div>

							{/* Liquid Formulation Conversion */}
							<div className='rounded-xl border border-[var(--oat-border)] bg-[var(--warm-cream)]/40 p-4'>
								<p className='mb-3 text-xs font-bold tracking-wider text-[var(--clay-black)] uppercase'>
									Liquid Suspension Formulation (تركيز الشراب)
								</p>
								<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
									<div>
										<Label
											className='text-xs'
											htmlFor='concMg'
										>
											Active Substance (mg)
										</Label>
										<Input
											id='concMg'
											onChange={e => setDrugConcentrationMg(e.target.value)}
											placeholder='250'
											type='number'
											value={drugConcentrationMg}
										/>
									</div>
									<div>
										<Label
											className='text-xs'
											htmlFor='volMl'
										>
											Per Volume (mL)
										</Label>
										<Input
											id='volMl'
											onChange={e => setDrugVolumeMl(e.target.value)}
											placeholder='5'
											type='number'
											value={drugVolumeMl}
										/>
									</div>
								</div>
							</div>

							{/* Calculation Output Result Card */}
							<div className='flex flex-col justify-between gap-4 rounded-xl border border-emerald-300 bg-emerald-50/80 p-5 sm:flex-row sm:items-center'>
								<div>
									<span className='text-xs font-bold tracking-wider text-emerald-800 uppercase'>
										Recommended Dose Result
									</span>
									<div className='mt-1 flex items-baseline gap-3'>
										<span className='font-headline text-3xl font-extrabold text-emerald-950'>
											{calculatedDoseMg} mg
										</span>
										<span className='text-sm text-emerald-800'>per dose</span>
									</div>
									<p className='mt-1 text-xs text-emerald-800'>
										Formula: {patientWeightKg || 0} kg &times;{" "}
										{targetMgPerKg || 0} mg/kg
									</p>
								</div>

								<div className='border-t border-emerald-200 pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6'>
									<span className='text-xs font-bold tracking-wider text-emerald-800 uppercase'>
										Liquid Volume (حجم الشراب)
									</span>
									<div className='mt-1 flex items-baseline gap-2'>
										<span className='font-headline text-3xl font-extrabold text-emerald-950'>
											{calculatedVolumeMl} mL
										</span>
										<span className='text-sm text-emerald-800'>orally</span>
									</div>
									<p className='mt-1 text-xs text-emerald-800'>
										@ {drugConcentrationMg}mg / {drugVolumeMl}mL
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Egyptian Common Pediatric Formulary Table */}
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader>
							<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
								Egyptian Pediatric Emergency &amp; Routine Reference
							</CardTitle>
							<CardDescription>
								Verified standard dosing guidelines for common outpatient
								medications
							</CardDescription>
						</CardHeader>
						<CardContent className='p-0'>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Generic (Brand)</TableHead>
										<TableHead>Recommended Dose</TableHead>
										<TableHead>Frequency</TableHead>
										<TableHead>Concentration</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{QUICK_FORMULARY.map(d => (
										<TableRow key={d.name}>
											<TableCell>
												<p className='text-xs font-bold text-[var(--clay-black)]'>
													{d.name}
												</p>
												<p className='text-xs text-[var(--warm-charcoal)]/70'>
													{d.tradeNames}
												</p>
											</TableCell>
											<TableCell className='text-xs font-semibold text-emerald-800'>
												{d.pediatricDose}
											</TableCell>
											<TableCell className='text-xs text-[var(--warm-charcoal)]'>
												{d.freq}
											</TableCell>
											<TableCell className='font-mono text-xs text-[var(--warm-charcoal)]'>
												{d.concentration}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>

				{/* 1 Col: Search & Monograph */}
				<div className='space-y-6'>
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader className='pb-3'>
							<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
								Formulary Database Search
							</CardTitle>
							<CardDescription>
								Search across pediatric registered pharmaceuticals
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='relative'>
								<MaterialIcon
									className='absolute top-1/2 left-3 -translate-y-1/2 text-[var(--warm-charcoal)]/60'
									name='search'
								/>
								<Input
									className='pl-10'
									onChange={e => setSearchQuery(e.target.value)}
									placeholder='Search drug name (e.g. Cefixime, Salbutamol)...'
									value={searchQuery}
								/>
							</div>

							{isSearchLoading ? (
								<p className='text-xs text-[var(--warm-charcoal)]/70'>
									Searching...
								</p>
							) : formularyResults && formularyResults.length > 0 ? (
								<div className='space-y-2'>
									{formularyResults.map(drug => (
										<button
											className='w-full cursor-pointer rounded-lg border border-[var(--oat-border)] p-3 text-left transition-colors hover:bg-[var(--oat-light)]'
											key={drug.id}
											onClick={() => setSearchQuery(drug.genericName)}
											type='button'
										>
											<p className='text-sm font-bold text-[var(--clay-black)]'>
												{drug.genericName}
											</p>
											<p className='text-xs text-[var(--warm-charcoal)]/80'>
												Category: {drug.pharmacologicalCategory} &bull; ATC:{" "}
												{drug.atcCode}
											</p>
										</button>
									))}
								</div>
							) : searchQuery.length >= 2 ? (
								<p className='text-xs text-[var(--warm-charcoal)]/70'>
									No matching drugs found in formulary index.
								</p>
							) : (
								<p className='text-xs text-[var(--warm-charcoal)]/70'>
									Type at least 2 characters to search the local catalog.
								</p>
							)}
						</CardContent>
					</Card>

					{/* Safety Cap Box */}
					<div className='rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-950'>
						<div className='mb-1 flex items-center gap-2 font-bold'>
							<MaterialIcon
								className='text-amber-600'
								name='verified_user'
							/>
							<span>Pediatric Maximum Cap Rule</span>
						</div>
						A calculated pediatric dose should never exceed the standard adult
						single or daily maximum dose, regardless of the child's weight.
					</div>
				</div>
			</div>
		</div>
	);
}
