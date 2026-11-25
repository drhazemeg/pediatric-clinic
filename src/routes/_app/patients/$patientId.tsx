// apps/web/src/routes/_app/patients.$patientId.tsx

import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { type ChangeEvent, useMemo, useState } from "react";
import {
	type GrowthCurvePoint,
	GrowthPercentileChart
} from "@/components/growth/GrowthPercentileChart";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
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
import {
	useGrowthCurves,
	useLatestPanel,
	usePatientMeasurements,
	useRecordMeasurement
} from "@/hooks/use-growth";
import {
	usePatientImmunizations,
	useRecordImmunization
} from "@/hooks/use-immunizations";
import { useLinkGuardian, usePatient } from "@/hooks/use-patients";
import { useEnqueuePatient } from "@/hooks/use-queue";
import { authClient } from "@/lib/auth-client";
import {
	type GrowthIndicatorOption,
	INDICATOR_LABELS
} from "@/lib/features/development";
import { patientChartSearchSchema } from "@/lib/web/route-search-schemas";
import { routeShell } from "@/lib/web/route-shell";
import { calculateAgeString, getTargetAgeMonths } from "@/utils/age";

export const Route = createFileRoute("/_app/patients/$patientId")({
	staticData: routeShell.app,
	validateSearch: patientChartSearchSchema,
	component: PatientChartComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	}
});

function getAgeInMonths(dateOfBirth: string): number {
	const birthDate = new Date(`${dateOfBirth}T00:00:00`);
	const today = new Date();
	return Math.max(
		0,
		(today.getFullYear() - birthDate.getFullYear()) * 12 +
			today.getMonth() -
			birthDate.getMonth() -
			(today.getDate() < birthDate.getDate() ? 1 : 0)
	);
}

function PatientChartComponent() {
	const { patientId } = Route.useParams();
	const { session } = Route.useRouteContext();
	const doctorId = session.data?.user.id;
	const clinicId = useActiveClinicId();

	const { data: patient, isLoading: isPatientLoading } = usePatient(patientId);
	const { data: latestPanel } = useLatestPanel(patientId);
	const { data: measurements } = usePatientMeasurements(patientId);
	const recordMeasurementMutation = useRecordMeasurement();

	const { data: immunizations } = usePatientImmunizations(patientId);
	const recordImmuneMutation = useRecordImmunization();

	const enqueueMutation = useEnqueuePatient();
	const linkGuardianMutation = useLinkGuardian();

	const [isMeasureOpen, setIsMeasureOpen] = useState(false);
	const [indicator, setIndicator] =
		useState<GrowthIndicatorOption>("weight-for-age");
	const [measureValue, setMeasureValue] = useState("");

	const [isImmuneOpen, setIsImmuneOpen] = useState(false);
	const [vaccineCode, setVaccineCode] = useState("BCG");
	const [doseNum, setDoseNum] = useState("1");
	const [lotNumber, setLotNumber] = useState("");

	const [isGuardianOpen, setIsGuardianOpen] = useState(false);
	const [guardianName, setGuardianName] = useState("");
	const [guardianRelation, setGuardianRelation] = useState("mother");
	const [guardianPhone, setGuardianPhone] = useState("");

	const patientSex: "male" | "female" =
		patient?.sex === "female" ? "female" : "male";
	const isBoy = patientSex === "male";
	const isPreterm =
		typeof patient?.gestationalAgeWeeks === "number" &&
		patient.gestationalAgeWeeks < 37;

	const { data: growthCurve } = useGrowthCurves(indicator, patientSex, 0, 24);

	const mappedCurvePoints = useMemo<GrowthCurvePoint[]>(() => {
		const pts = growthCurve?.points ?? [];
		return pts.map(p => ({
			ageMonths: Number(p.x ?? 0),
			p3: Number(p.sd2neg ?? p.sd3neg ?? 0),
			p15: Number(p.sd1neg ?? 0),
			p50: Number(p.median ?? 0),
			p85: Number(p.sd1 ?? 0),
			p97: Number(p.sd2 ?? p.sd3 ?? 0)
		}));
	}, [growthCurve]);

	const mappedChildMeasurements = useMemo(
		() =>
			(measurements ?? []).map(m => ({
				ageMonths: Number((m.day / 30.4375).toFixed(1)),
				value: m.value
			})),
		[measurements]
	);

	const handleRecordMeasureSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
		e.preventDefault();
		const parsedValue = Number.parseFloat(measureValue);
		if (!Number.isFinite(parsedValue) || parsedValue <= 0) return;
		const visitId = patient?.visits?.[0]?.id;
		if (!visitId) return;

		await recordMeasurementMutation.mutateAsync({
			patientId,
			visitId,
			indicator,
			value: parsedValue,
			sex: patient.sex,
			ageMonths: getAgeInMonths(patient.dateOfBirth)
		});

		setMeasureValue("");
		setIsMeasureOpen(false);
	};

	const handleRecordImmuneSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
		e.preventDefault();
		const parsedDose = Number.parseInt(doseNum, 10);
		const safeDose =
			Number.isFinite(parsedDose) && parsedDose > 0 ? parsedDose : 1;

		await recordImmuneMutation.mutateAsync({
			patientId,
			vaccineKey: vaccineCode,
			vaccineName: vaccineCode,
			targetAgeMonths: getTargetAgeMonths(vaccineCode, safeDose),
			doseNumber: safeDose,
			lotNumber: lotNumber.trim() || undefined,
			administeredDate: new Date()
		});

		setLotNumber("");
		setIsImmuneOpen(false);
	};

	const handleLinkGuardianSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!guardianName.trim() || !doctorId) return;

		await linkGuardianMutation.link({
			patientId,
			userId: doctorId,
			guardianName: guardianName.trim(),
			phone: guardianPhone.trim(),
			relation: guardianRelation || "mother",
			isPrimary: true
		});

		setGuardianName("");
		setGuardianPhone("");
		setIsGuardianOpen(false);
	};

	if (isPatientLoading) {
		return (
			<div className='mx-auto max-w-7xl space-y-6 px-4 py-8'>
				<Skeleton className='h-36 w-full' />
				<Skeleton className='h-64 w-full' />
			</div>
		);
	}

	if (!patient) {
		return (
			<div className='mx-auto max-w-7xl px-4 py-16 text-center'>
				<MaterialIcon
					className='text-5xl text-[var(--warm-charcoal)]/40'
					name='sentiment_dissatisfied'
				/>
				<h2 className='mt-3 text-lg font-bold text-[var(--clay-black)]'>
					Patient Chart Not Found
				</h2>
				<p className='text-sm text-[var(--warm-charcoal)]/80'>
					The requested patient record could not be loaded.
				</p>
				<Link
					className='mt-4 inline-block'
					to='/patients'
				>
					<Button
						type='button'
						variant='outline'
					>
						Back to Directory
					</Button>
				</Link>
			</div>
		);
	}

	const weightM = latestPanel?.["weight-for-age"];
	const heightM = latestPanel?.["length-for-age"];
	const hcM = latestPanel?.["head-circumference-for-age"];
	const bmiM = latestPanel?.["bmi-for-age"];
	const activeIndicatorMeta = INDICATOR_LABELS[indicator];

	return (
		<div className='mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8'>
			<div className='mb-4 flex items-center gap-2 text-sm text-[var(--warm-charcoal)]/70'>
				<Link
					className='hover:text-[var(--clay-black)]'
					to='/patients'
				>
					Patients Directory
				</Link>
				<MaterialIcon
					className='text-xs'
					name='chevron_right'
				/>
				<span className='font-semibold text-[var(--clay-black)]'>
					{patient.firstName} {patient.lastName} ({patient.mrn})
				</span>
			</div>

			<div className='mb-6 rounded-[var(--radius-xl)] border border-[var(--oat-border)] bg-[var(--pure-white)] p-6 shadow-sm'>
				<div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
					<div className='flex flex-wrap items-center gap-3'>
						<span
							className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
								isBoy
									? "bg-blue-100 text-blue-700"
									: "bg-pink-100 text-pink-700"
							}`}
						>
							{isBoy ? "♂" : "♀"}
						</span>
						<div>
							<div className='flex items-center gap-2'>
								<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
									{patient.firstName} {patient.lastName}
								</h1>
								<span className='rounded bg-[var(--oat-light)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--clay-black)]'>
									MRN: {patient.mrn}
								</span>
							</div>
							<p className='mt-1 text-sm text-[var(--warm-charcoal)]/80'>
								DOB: <strong>{patient.dateOfBirth}</strong> &bull; Age:{" "}
								<strong>{calculateAgeString(patient.dateOfBirth)}</strong>{" "}
								&bull; Sex:{" "}
								<strong className='capitalize'>{patient.sex}</strong>
								{isPreterm && (
									<span className='ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900'>
										Preterm — Verify corrected age
									</span>
								)}
							</p>
						</div>
					</div>

					<Button
						className='gap-2 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
						disabled={enqueueMutation.isPending}
						onClick={() =>
							enqueueMutation.mutateAsync({
								clinicId,
								patientId,
								priority: 0
							})
						}
						type='button'
					>
						<MaterialIcon name='person_check' />
						<span>Add to Waiting Queue</span>
					</Button>
				</div>

				<div className='mt-6 grid grid-cols-2 gap-4 border-t border-[var(--oat-border)] pt-4 sm:grid-cols-4 lg:grid-cols-5'>
					<div>
						<span className='text-xs font-medium text-[var(--warm-charcoal)]/70'>
							Current Weight
						</span>
						<p className='text-base font-bold text-[var(--clay-black)]'>
							{patient.weightKg ? `${patient.weightKg} kg` : "Not recorded"}
						</p>
					</div>
					<div>
						<span className='text-xs font-medium text-[var(--warm-charcoal)]/70'>
							Gestational Age (GA)
						</span>
						<p className='text-base font-bold text-[var(--clay-black)]'>
							{patient.gestationalAgeWeeks
								? `${patient.gestationalAgeWeeks} weeks`
								: "Term"}
						</p>
					</div>
					<div>
						<span className='text-xs font-medium text-[var(--warm-charcoal)]/70'>
							Birth Weight
						</span>
						<p className='text-base font-bold text-[var(--clay-black)]'>
							{patient.birthWeightKg ? `${patient.birthWeightKg} kg` : "-"}
						</p>
					</div>
					<div>
						<span className='text-xs font-medium text-[var(--warm-charcoal)]/70'>
							Guardian / Phone
						</span>
						<p className='text-sm font-medium text-[var(--clay-black)]'>
							{patient.parentName || patient.phone || "No contact"}
						</p>
					</div>
					<div>
						<span className='text-xs font-medium text-[var(--warm-charcoal)]/70'>
							Allergies Alert
						</span>
						{patient.allergies ? (
							<p className='rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900'>
								⚠️ {patient.allergies}
							</p>
						) : (
							<p className='text-xs font-semibold text-emerald-700'>
								No known allergies
							</p>
						)}
					</div>
				</div>
			</div>

			<Tabs
				className='space-y-6'
				defaultValue='visits'
			>
				<TabsList className='border-b border-[var(--oat-border)] bg-transparent p-0'>
					<TabsTrigger
						className='data-[state=active]:border-b-2 data-[state=active]:border-[var(--matcha-600)] data-[state=active]:text-[var(--matcha-800)]'
						value='visits'
					>
						<MaterialIcon
							className='mr-1.5 text-base'
							name='stethoscope'
						/>
						<span>Clinical Encounters ({patient.visits?.length ?? 0})</span>
					</TabsTrigger>
					<TabsTrigger
						className='data-[state=active]:border-b-2 data-[state=active]:border-[var(--matcha-600)] data-[state=active]:text-[var(--matcha-800)]'
						value='growth'
					>
						<MaterialIcon
							className='mr-1.5 text-base'
							name='monitoring'
						/>
						<span>Growth &amp; Vitals</span>
					</TabsTrigger>
					<TabsTrigger
						className='data-[state=active]:border-b-2 data-[state=active]:border-[var(--matcha-600)] data-[state=active]:text-[var(--matcha-800)]'
						value='immunizations'
					>
						<MaterialIcon
							className='mr-1.5 text-base'
							name='vaccines'
						/>
						<span>Immunizations</span>
					</TabsTrigger>
					<TabsTrigger
						className='data-[state=active]:border-b-2 data-[state=active]:border-[var(--matcha-600)] data-[state=active]:text-[var(--matcha-800)]'
						value='guardians'
					>
						<MaterialIcon
							className='mr-1.5 text-base'
							name='escalator_warning'
						/>
						<span>Guardians &amp; Contacts</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent
					className='space-y-4'
					value='visits'
				>
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader>
							<CardTitle className='text-lg font-bold text-[var(--clay-black)]'>
								Encounter History (الزيارات الطبية)
							</CardTitle>
							<CardDescription>
								Outpatient consultations, lactation notes, and physician
								assessments
							</CardDescription>
						</CardHeader>
						<CardContent>
							{(patient.visits ?? []).length === 0 ? (
								<div className='py-8 text-center text-sm text-[var(--warm-charcoal)]/80'>
									No clinical visits documented yet for this patient.
								</div>
							) : (
								<div className='divide-y divide-[var(--oat-border)]'>
									{(patient.visits ?? []).map(visit => (
										<div
											className='flex items-center justify-between py-3.5'
											key={visit.id}
										>
											<div>
												<p className='text-base font-bold text-[var(--clay-black)]'>
													{visit.chiefComplaint || "Routine Pediatric Visit"}
												</p>
												<p className='text-xs text-[var(--warm-charcoal)]/80'>
													Visited:{" "}
													{new Date(visit.visitedAt).toLocaleDateString([], {
														year: "numeric",
														month: "short",
														day: "numeric"
													})}{" "}
													&bull; Status:{" "}
													<strong className='uppercase'>{visit.status}</strong>
												</p>
												{visit.plan && (
													<p className='mt-1 text-xs text-[var(--clay-black)]/90'>
														Plan: {visit.plan}
													</p>
												)}
											</div>
											<Link
												params={{ visitId: visit.id }}
												to='/visits/$visitId'
											>
												<Button
													size='sm'
													type='button'
													variant='outline'
												>
													Open SOAP Note
												</Button>
											</Link>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent
					className='space-y-4'
					value='growth'
				>
					<div className='flex flex-wrap items-center justify-between gap-3'>
						<h3 className='text-lg font-bold text-[var(--clay-black)]'>
							Anthropometric Measurements &amp; Growth Chart
						</h3>
						<Dialog
							onOpenChange={setIsMeasureOpen}
							open={isMeasureOpen}
						>
							<DialogTrigger>
								<Button
									className='gap-2 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
									size='sm'
									type='button'
								>
									<MaterialIcon name='add_circle' />
									<span>Record Measurement</span>
								</Button>
							</DialogTrigger>
							<DialogContent className='bg-[var(--pure-white)]'>
								<DialogHeader>
									<DialogTitle>Record Anthropometric Measurement</DialogTitle>
									<DialogDescription>
										Add weight, length, head circumference, or BMI for WHO &amp;
										Egyptian LMS tracking.
									</DialogDescription>
								</DialogHeader>
								<form
									className='space-y-4 py-2'
									onSubmit={handleRecordMeasureSubmit}
								>
									<div>
										<Label htmlFor='indicator'>Indicator</Label>
										<Select
											onValueChange={v =>
												v && setIndicator(v as GrowthIndicatorOption)
											}
											value={indicator}
										>
											<SelectTrigger id='indicator'>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='weight-for-age'>
													Weight (kg)
												</SelectItem>
												<SelectItem value='length-for-age'>
													Length / Height (cm)
												</SelectItem>
												<SelectItem value='head-circumference-for-age'>
													Head Circumference (cm)
												</SelectItem>
												<SelectItem value='bmi-for-age'>BMI (kg/m²)</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor='measureVal'>Value</Label>
										<Input
											id='measureVal'
											onChange={e => setMeasureValue(e.target.value)}
											placeholder='e.g. 7.5'
											required
											step='0.01'
											type='number'
											value={measureValue}
										/>
									</div>

									<DialogFooter>
										<Button
											onClick={() => setIsMeasureOpen(false)}
											type='button'
											variant='outline'
										>
											Cancel
										</Button>
										<Button
											className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
											disabled={recordMeasurementMutation.isPending}
											type='submit'
										>
											Save
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					</div>

					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
						<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
							<CardHeader className='pb-2'>
								<CardTitle className='text-xs font-semibold text-[var(--warm-charcoal)] uppercase'>
									Weight
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
									{weightM?.value != null ? `${weightM.value} kg` : "-"}
								</p>
								<p className='text-xs text-[var(--warm-charcoal)]'>
									{weightM?.percentile != null
										? `P${weightM.percentile.toFixed(0)} (WHO)`
										: "No percentile"}
								</p>
							</CardContent>
						</Card>

						<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
							<CardHeader className='pb-2'>
								<CardTitle className='text-xs font-semibold text-[var(--warm-charcoal)] uppercase'>
									Length / Height
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
									{heightM?.value != null ? `${heightM.value} cm` : "-"}
								</p>
								<p className='text-xs text-[var(--warm-charcoal)]'>
									{heightM?.percentile != null
										? `P${heightM.percentile.toFixed(0)} (WHO)`
										: "No percentile"}
								</p>
							</CardContent>
						</Card>

						<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
							<CardHeader className='pb-2'>
								<CardTitle className='text-xs font-semibold text-[var(--warm-charcoal)] uppercase'>
									Head Circumference
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
									{hcM?.value != null ? `${hcM.value} cm` : "-"}
								</p>
								<p className='text-xs text-[var(--warm-charcoal)]'>
									{hcM?.percentile != null
										? `P${hcM.percentile.toFixed(0)} (WHO)`
										: "No percentile"}
								</p>
							</CardContent>
						</Card>

						<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
							<CardHeader className='pb-2'>
								<CardTitle className='text-xs font-semibold text-[var(--warm-charcoal)] uppercase'>
									BMI
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
									{bmiM?.value != null ? `${bmiM.value.toFixed(1)}` : "-"}
								</p>
								<p className='text-xs text-[var(--warm-charcoal)]'>
									{bmiM?.percentile != null
										? `P${bmiM.percentile.toFixed(0)} (WHO)`
										: "No percentile"}
								</p>
							</CardContent>
						</Card>
					</div>

					<GrowthPercentileChart
						childMeasurements={mappedChildMeasurements}
						curveData={mappedCurvePoints}
						indicator={indicator}
						sex={patientSex}
						standard='who'
						title={activeIndicatorMeta.label}
						unit={activeIndicatorMeta.unit}
					/>

					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader>
							<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
								Recorded Measurements
							</CardTitle>
						</CardHeader>
						<CardContent className='p-0'>
							{(measurements ?? []).length === 0 ? (
								<p className='py-6 text-center text-sm text-[var(--warm-charcoal)]/80'>
									No individual measurements logged yet.
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Indicator</TableHead>
											<TableHead>Value</TableHead>
											<TableHead>Source</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{(measurements ?? []).map((m, idx) => {
											const meta = activeIndicatorMeta;
											const rowKey =
												(m as { id?: string }).id ??
												`${m.day}-${m.value}-${idx}`;

											return (
												<TableRow key={rowKey}>
													<TableCell className='text-xs text-[var(--warm-charcoal)]'>
														Day {m.day} (~{(m.day / 30.43).toFixed(1)} mo)
													</TableCell>
													<TableCell className='text-xs font-medium text-[var(--clay-black)] capitalize'>
														{meta.label}
													</TableCell>
													<TableCell className='text-xs font-bold text-[var(--clay-black)]'>
														{m.value} {meta.unit}
													</TableCell>
													<TableCell className='text-xs text-[var(--warm-charcoal)]/70'>
														Clinic Chart
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent
					className='space-y-4'
					value='immunizations'
				>
					<div className='flex items-center justify-between'>
						<div>
							<h3 className='text-lg font-bold text-[var(--clay-black)]'>
								Immunization History &amp; Routine Schedule
							</h3>
							<p className='text-xs text-[var(--warm-charcoal)]/80'>
								Egyptian Ministry of Health childhood routine vaccination
								schedule
							</p>
						</div>
						<Dialog
							onOpenChange={setIsImmuneOpen}
							open={isImmuneOpen}
						>
							<DialogTrigger>
								<Button
									className='gap-2 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
									size='sm'
									type='button'
								>
									<MaterialIcon name='vaccines' />
									<span>Record Immunization</span>
								</Button>
							</DialogTrigger>
							<DialogContent className='bg-[var(--pure-white)]'>
								<DialogHeader>
									<DialogTitle>Administer / Record Immunization</DialogTitle>
									<DialogDescription>
										Log vaccine administration in the child&apos;s official
										clinical record.
									</DialogDescription>
								</DialogHeader>
								<form
									className='space-y-4 py-2'
									onSubmit={handleRecordImmuneSubmit}
								>
									<div>
										<Label htmlFor='vaxCode'>Vaccine</Label>
										<Select
											onValueChange={val => val && setVaccineCode(val)}
											value={vaccineCode}
										>
											<SelectTrigger id='vaxCode'>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='BCG'>
													BCG (Tuberculosis - Birth)
												</SelectItem>
												<SelectItem value='HepB_Birth'>
													Hepatitis B (Birth dose)
												</SelectItem>
												<SelectItem value='Pentavalent'>
													Pentavalent (DTP-HepB-Hib)
												</SelectItem>
												<SelectItem value='OPV'>OPV (Oral Polio)</SelectItem>
												<SelectItem value='IPV'>
													IPV (Inactivated Polio)
												</SelectItem>
												<SelectItem value='MMR'>
													MMR (Measles-Mumps-Rubella)
												</SelectItem>
												<SelectItem value='VitA'>Vitamin A Capsule</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor='doseNum'>Dose Number</Label>
										<Input
											id='doseNum'
											max='5'
											min='1'
											onChange={e => setDoseNum(e.target.value)}
											required
											type='number'
											value={doseNum}
										/>
									</div>

									<div>
										<Label htmlFor='lotNum'>Batch / Lot Number</Label>
										<Input
											id='lotNum'
											onChange={e => setLotNumber(e.target.value)}
											placeholder='e.g. LOT-2026-X9'
											value={lotNumber}
										/>
									</div>

									<DialogFooter>
										<Button
											onClick={() => setIsImmuneOpen(false)}
											type='button'
											variant='outline'
										>
											Cancel
										</Button>
										<Button
											className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
											disabled={recordImmuneMutation.isPending}
											type='submit'
										>
											Confirm Administration
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					</div>

					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardContent className='p-0'>
							{(immunizations ?? []).length === 0 ? (
								<p className='py-8 text-center text-sm text-[var(--warm-charcoal)]/80'>
									No immunizations logged yet for this child.
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Vaccine</TableHead>
											<TableHead>Dose</TableHead>
											<TableHead>Date Administered</TableHead>
											<TableHead>Lot Number</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{(immunizations ?? []).map(im => (
											<TableRow key={im.id}>
												<TableCell className='text-xs font-bold text-[var(--clay-black)]'>
													{im.vaccineName}
												</TableCell>
												<TableCell className='text-xs text-[var(--warm-charcoal)]'>
													#{im.doseNumber}
												</TableCell>
												<TableCell className='text-xs text-[var(--warm-charcoal)]'>
													{im.administeredDate
														? new Date(im.administeredDate).toLocaleDateString()
														: "-"}
												</TableCell>
												<TableCell className='font-mono text-xs text-[var(--warm-charcoal)]/80'>
													{im.lotNumber || "-"}
												</TableCell>
												<TableCell>
													<span className='rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800'>
														Administered
													</span>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent
					className='space-y-4'
					value='guardians'
				>
					<div className='flex items-center justify-between'>
						<div>
							<h3 className='text-lg font-bold text-[var(--clay-black)]'>
								Guardians &amp; Authorized Contacts
							</h3>
							<p className='text-xs text-[var(--warm-charcoal)]/80'>
								Family members authorized for pediatric &amp; lactation care
								decisions and notifications
							</p>
						</div>

						<Dialog
							onOpenChange={setIsGuardianOpen}
							open={isGuardianOpen}
						>
							<DialogTrigger>
								<Button
									className='gap-2 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
									size='sm'
									type='button'
								>
									<MaterialIcon name='person_add' />
									<span>Link Guardian</span>
								</Button>
							</DialogTrigger>
							<DialogContent className='bg-[var(--pure-white)]'>
								<DialogHeader>
									<DialogTitle>Link Guardian / Parent</DialogTitle>
									<DialogDescription>
										Add authorized parent or legal guardian details.
									</DialogDescription>
								</DialogHeader>
								<form
									className='space-y-4 py-2'
									onSubmit={handleLinkGuardianSubmit}
								>
									<div>
										<Label htmlFor='gName'>Full Name *</Label>
										<Input
											id='gName'
											onChange={e => setGuardianName(e.target.value)}
											placeholder='e.g. Fatima Mahmoud'
											required
											value={guardianName}
										/>
									</div>
									<div>
										<Label htmlFor='gRel'>Relationship</Label>
										<Select
											onValueChange={val => val && setGuardianRelation(val)}
											value={guardianRelation}
										>
											<SelectTrigger id='gRel'>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='mother'>Mother (أم)</SelectItem>
												<SelectItem value='father'>Father (أب)</SelectItem>
												<SelectItem value='guardian'>
													Legal Guardian (وصي)
												</SelectItem>
												<SelectItem value='relative'>
													Relative (قريب)
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div>
										<Label htmlFor='gPhone'>Phone Number</Label>
										<Input
											id='gPhone'
											onChange={e => setGuardianPhone(e.target.value)}
											placeholder='010xxxxxxxx'
											value={guardianPhone}
										/>
									</div>
									<DialogFooter>
										<Button
											onClick={() => setIsGuardianOpen(false)}
											type='button'
											variant='outline'
										>
											Cancel
										</Button>
										<Button
											className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
											disabled={linkGuardianMutation.isPending}
											type='submit'
										>
											Link
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					</div>

					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardContent className='space-y-3 p-4'>
							<div className='flex items-center justify-between rounded-lg border border-[var(--oat-border)] p-3'>
								<div>
									<p className='text-sm font-bold text-[var(--clay-black)]'>
										{patient.parentName || "Primary Guardian"}
									</p>
									<p className='text-xs text-[var(--warm-charcoal)]/80'>
										Primary contact &bull; Phone:{" "}
										{patient.phone || patient.parentPhone || "None"}
									</p>
								</div>
								<span className='rounded bg-[var(--matcha-100)] px-2 py-0.5 text-xs font-semibold text-[var(--matcha-800)]'>
									Primary
								</span>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
