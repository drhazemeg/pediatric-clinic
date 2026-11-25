// apps/web/src/routes/_app.visits.$visitId.tsx

import {
	createFileRoute,
	Link,
	redirect,
	useNavigate
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { useAiTrigger } from "@/hooks/use-ai";
import {
	useCancelPrescription,
	useCreatePrescription,
	useFormularySearch,
	usePrescriptionsForVisit
} from "@/hooks/use-prescriptions";
import { useCompleteVisit, useUpdateVisit, useVisit } from "@/hooks/use-visits";
import { authClient } from "@/lib/auth-client";

const visitSearchSchema = z.object({
	tab: z.enum(["soap", "prescriptions"]).catch("soap").default("soap"),
	rxModal: z.boolean().catch(false).default(false)
});

interface SoapDraft {
	chiefComplaint: string;
	symptoms: string;
	physicalExam: string;
	diagnosis: string;
	plan: string;
	notes: string;
}

interface PrescriptionFormState {
	drugId: string | null;
	drugName: string;
	category: string;
	defaultUnit: string;
	doseAmount: string;
	doseUnit: string;
	frequency: string;
	durationDays: string;
	instructions: string;
}

const EMPTY_SOAP: SoapDraft = {
	chiefComplaint: "",
	symptoms: "",
	physicalExam: "",
	diagnosis: "",
	plan: "",
	notes: ""
};

function createInitialRxState(weightKg?: number | null): PrescriptionFormState {
	const weightHint =
		typeof weightKg === "number" && weightKg > 0
			? `Patient weight: ${weightKg} kg`
			: "";
	return {
		drugId: null,
		drugName: "",
		category: "",
		defaultUnit: "mg/kg/day",
		doseAmount: "",
		doseUnit: "mg",
		frequency: "TID",
		durationDays: "5",
		instructions: weightHint
	};
}

export const Route = createFileRoute("/_app/visits/$visitId")({
	validateSearch: visitSearchSchema,
	ssr: "data-only",
	head: () => ({
		meta: [{ title: "Pediatric Clinical Encounter — Smart Clinic" }]
	}),
	component: VisitEncounterComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	}
});

function VisitEncounterComponent() {
	const { visitId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const { data: visit, isLoading } = useVisit(visitId);
	const updateVisitMutation = useUpdateVisit();
	const completeVisitMutation = useCompleteVisit();

	const { data: prescriptions } = usePrescriptionsForVisit(visitId);
	const createRxMutation = useCreatePrescription();
	const cancelRxMutation = useCancelPrescription();

	const soapAi = useAiTrigger("soap_note");
	const parentEdAi = useAiTrigger("patient_education");

	const [soap, setSoap] = useState<SoapDraft>(EMPTY_SOAP);
	const [searchQuery, setSearchQuery] = useState("");
	const { data: formularyResults } = useFormularySearch(searchQuery);
	const [rxForm, setRxForm] = useState<PrescriptionFormState>(() =>
		createInitialRxState(null)
	);

	useEffect(() => {
		if (!visit) return;
		setSoap({
			chiefComplaint: visit.chiefComplaint ?? "",
			symptoms: visit.symptoms ?? "",
			physicalExam: visit.physicalExam ?? "",
			diagnosis: visit.diagnosis ?? "",
			plan: visit.plan ?? "",
			notes: visit.notes ?? ""
		});
	}, [visit]);

	const isCompleted = visit?.status === "completed";
	const isSaving =
		updateVisitMutation.isPending || completeVisitMutation.isPending;

	const setRxModalOpen = (open: boolean) => {
		if (open && visit) {
			setRxForm(createInitialRxState(visit.patient?.weightKg));
			setSearchQuery("");
		}
		navigate({
			search: prev => ({ ...prev, rxModal: open }),
			replace: true
		});
	};

	const setActiveTab = (tab: "soap" | "prescriptions") => {
		navigate({
			search: prev => ({ ...prev, tab }),
			replace: true
		});
	};

	const saveEncounterDraft = async (showToast = true) => {
		await updateVisitMutation.mutateAsync({
			id: visitId,
			patch: soap
		});
		if (showToast) {
			toast.success("Encounter note saved");
		}
	};

	const handleFinalizeVisit = async () => {
		if (!visit || isCompleted) return;
		await saveEncounterDraft(false);
		await completeVisitMutation.mutateAsync({
			id: visitId,
			patientId: visit.patientId
		});
		toast.success("Encounter finalized and signed");
	};

	const handleAddPrescriptionSubmit = async (
		e: React.ChangeEvent<HTMLFormElement>
	) => {
		e.preventDefault();
		const parsedDose = Number.parseFloat(rxForm.doseAmount);
		const parsedDuration = Number.parseInt(rxForm.durationDays, 10);

		if (
			!visit ||
			isCompleted ||
			!rxForm.drugId ||
			!rxForm.drugName ||
			Number.isNaN(parsedDose) ||
			parsedDose <= 0 ||
			Number.isNaN(parsedDuration) ||
			parsedDuration < 1
		) {
			toast.error("Select a medication and enter a valid dose and duration");
			return;
		}

		await createRxMutation.mutateAsync({
			patientId: visit.patientId,
			visitId,
			medicationName: rxForm.drugName,
			dosage: `${parsedDose} ${rxForm.doseUnit}`,
			frequency: rxForm.frequency,
			durationDays: parsedDuration,
			instructions: rxForm.instructions.trim() || undefined
		});

		setRxForm(createInitialRxState(visit.patient?.weightKg));
		setSearchQuery("");
		setRxModalOpen(false);
	};

	const handleTriggerSoapAi = async () => {
		if (!visit) return;
		const freeText = [
			`Chief Complaint: ${soap.chiefComplaint}`,
			`Symptoms: ${soap.symptoms}`,
			`Exam: ${soap.physicalExam}`,
			`Diagnosis: ${soap.diagnosis}`
		].join("\n");

		await soapAi.trigger({
			patientId: visit.patientId,
			visitId,
			freeText
		});
		toast.info("AI SOAP draft requested — check Task Monitor for completion");
	};

	const handleTriggerParentEdAi = async () => {
		if (!visit) return;
		await parentEdAi.trigger({
			patientId: visit.patientId,
			visitId,
			freeText: `Diagnosis: ${soap.diagnosis}\nPlan: ${soap.plan}`,
			language: "ar"
		});
		toast.info("Parent Instructions requested in Arabic");
	};

	if (isLoading) {
		return (
			<div className='mx-auto max-w-7xl space-y-6 px-4 py-8'>
				<Skeleton className='h-28 w-full' />
				<Skeleton className='h-96 w-full' />
			</div>
		);
	}

	if (!visit) {
		return (
			<div className='mx-auto max-w-7xl px-4 py-16 text-center'>
				<MaterialIcon
					className='text-5xl text-[var(--warm-charcoal)]/40'
					name='receipt_long'
				/>
				<h2 className='mt-2 text-lg font-bold text-[var(--clay-black)]'>
					Encounter Not Found
				</h2>
			</div>
		);
	}

	const patientFullName =
		[visit.patient?.firstName, visit.patient?.lastName]
			.filter(Boolean)
			.join(" ") || "Patient";
	const patientWeightKg = visit.patient?.weightKg;

	return (
		<div className='mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8'>
			{/* Breadcrumb */}
			<div className='mb-4 flex items-center gap-2 text-sm text-[var(--warm-charcoal)]/70'>
				<Link
					className='hover:text-[var(--clay-black)]'
					params={{ patientId: visit.patientId }}
					search={{ tab: "visits" }}
					to='/patients/$patientId'
				>
					Patient Chart ({patientFullName})
				</Link>
				<MaterialIcon
					className='text-xs'
					name='chevron_right'
				/>
				<span className='font-semibold text-[var(--clay-black)]'>
					Encounter &bull; {new Date(visit.visitedAt).toLocaleDateString()}
				</span>
			</div>

			{/* Header Banner */}
			<div className='mb-6 flex flex-col justify-between gap-4 rounded-[var(--radius-xl)] border border-[var(--oat-border)] bg-[var(--pure-white)] p-6 shadow-sm md:flex-row md:items-center'>
				<div className='flex items-center gap-3'>
					<span className='flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--matcha-100)] text-[var(--matcha-700)]'>
						<MaterialIcon name='medical_services' />
					</span>
					<div>
						<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
							Pediatric Clinical Encounter
						</h1>
						<p className='text-xs text-[var(--warm-charcoal)]/80'>
							Patient:{" "}
							<strong className='text-[var(--clay-black)]'>
								{patientFullName}
							</strong>{" "}
							&bull; MRN: <strong>{visit.patient?.mrn}</strong> &bull; Weight:{" "}
							<strong>
								{typeof patientWeightKg === "number"
									? `${patientWeightKg} kg`
									: "Not measured"}
							</strong>
						</p>
					</div>
				</div>

				<div className='flex flex-wrap items-center gap-3'>
					<span
						className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
							isCompleted
								? "bg-emerald-100 text-emerald-900"
								: "bg-blue-100 text-blue-900"
						}`}
					>
						{visit.status.replace("_", " ")}
					</span>

					{!isCompleted && (
						<>
							<Button
								disabled={isSaving}
								onClick={() => saveEncounterDraft(true)}
								type='button'
								variant='outline'
							>
								Save Draft
							</Button>

							<Button
								className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
								disabled={isSaving}
								onClick={handleFinalizeVisit}
								type='button'
							>
								<MaterialIcon
									className='mr-1.5 text-base'
									name='check_circle'
								/>
								<span>Finalize &amp; Sign</span>
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Allergy Warning */}
			{visit.patient?.allergies && (
				<div className='mb-6 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-950'>
					<MaterialIcon
						className='text-amber-600'
						name='warning'
					/>
					<span>Known Allergies: {visit.patient.allergies}</span>
				</div>
			)}

			{/* Quick Section Switcher */}
			<div className='mb-6 flex items-center gap-2'>
				<Button
					onClick={() => setActiveTab("soap")}
					size='sm'
					type='button'
					variant={search.tab === "soap" ? "default" : "outline"}
				>
					SOAP Note
				</Button>
				<Button
					onClick={() => setActiveTab("prescriptions")}
					size='sm'
					type='button'
					variant={search.tab === "prescriptions" ? "default" : "outline"}
				>
					Prescriptions ({(prescriptions ?? []).length})
				</Button>
			</div>

			{/* 2 Column Layout */}
			<div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
				{/* Left 2 Columns: SOAP Note & Prescriptions */}
				<div className='space-y-6 lg:col-span-2'>
					{search.tab === "soap" && (
						<>
							<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
								<CardHeader className='pb-3'>
									<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
										Subjective (S) &bull; الشكوى والتاريخ المرضي
									</CardTitle>
								</CardHeader>
								<CardContent className='space-y-4'>
									<div>
										<Label htmlFor='cc'>
											Chief Complaint (الشكوى الرئيسية)
										</Label>
										<Input
											disabled={isCompleted}
											id='cc'
											onChange={e =>
												setSoap(prev => ({
													...prev,
													chiefComplaint: e.target.value
												}))
											}
											placeholder='e.g. Fever for 2 days, poor feeding, cough'
											value={soap.chiefComplaint}
										/>
									</div>
									<div>
										<Label htmlFor='hpi'>
											History of Present Illness &amp; Feeding
										</Label>
										<Textarea
											disabled={isCompleted}
											id='hpi'
											onChange={e =>
												setSoap(prev => ({ ...prev, symptoms: e.target.value }))
											}
											placeholder='Onset, progression, feeding history (breast milk / formula), sleep, stool/urine...'
											rows={3}
											value={soap.symptoms}
										/>
									</div>
								</CardContent>
							</Card>

							<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
								<CardHeader className='pb-3'>
									<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
										Objective (O) &bull; الفحص الإكلينيكي
									</CardTitle>
								</CardHeader>
								<CardContent>
									<Label htmlFor='exam'>Physical Examination Findings</Label>
									<Textarea
										disabled={isCompleted}
										id='exam'
										onChange={e =>
											setSoap(prev => ({
												...prev,
												physicalExam: e.target.value
											}))
										}
										placeholder='General appearance, HEENT (throat, ears), Chest (auscultation, wheeze), Heart, Abdomen, Skin rash, Neurological tone...'
										rows={4}
										value={soap.physicalExam}
									/>
								</CardContent>
							</Card>

							<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
								<CardHeader className='pb-3'>
									<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
										Assessment (A) &bull; التشخيص
									</CardTitle>
								</CardHeader>
								<CardContent>
									<Label htmlFor='dx'>
										Primary Diagnosis &amp; ICD-10 Impression
									</Label>
									<Input
										disabled={isCompleted}
										id='dx'
										onChange={e =>
											setSoap(prev => ({ ...prev, diagnosis: e.target.value }))
										}
										placeholder='e.g. Acute Viral Bronchiolitis (J21.9), Acute Otitis Media'
										value={soap.diagnosis}
									/>
								</CardContent>
							</Card>

							<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
								<CardHeader className='pb-3'>
									<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
										Plan (P) &bull; خطة العلاج وتوجيهات الأهل
									</CardTitle>
								</CardHeader>
								<CardContent>
									<Label htmlFor='planText'>
										Management &amp; Counseling Plan
									</Label>
									<Textarea
										disabled={isCompleted}
										id='planText'
										onChange={e =>
											setSoap(prev => ({ ...prev, plan: e.target.value }))
										}
										placeholder='Supportive care, hydration, nasal saline suction, red flags for emergency care...'
										rows={3}
										value={soap.plan}
									/>
								</CardContent>
							</Card>
						</>
					)}

					{/* Prescriptions Card */}
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader className='flex flex-row items-center justify-between pb-3'>
							<div>
								<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
									Prescribed Medications (الوصفات الدوائية)
								</CardTitle>
								<CardDescription>
									Weight-based pediatric prescriptions linked to this visit
								</CardDescription>
							</div>

							{!isCompleted && (
								<Dialog
									onOpenChange={setRxModalOpen}
									open={search.rxModal}
								>
									<DialogTrigger>
										<Button
											className='gap-2 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
											size='sm'
											type='button'
										>
											<MaterialIcon name='medication' />
											<span>Add Medication</span>
										</Button>
									</DialogTrigger>
									<DialogContent className='max-w-xl bg-[var(--pure-white)]'>
										<DialogHeader>
											<DialogTitle>Add Pediatric Prescription</DialogTitle>
											<DialogDescription>
												Calculate weight-based dosage from the Egyptian
												Formulary.
											</DialogDescription>
										</DialogHeader>
										<form
											className='space-y-4 py-2'
											onSubmit={handleAddPrescriptionSubmit}
										>
											<div>
												<Label htmlFor='rxSearch'>
													Search Medication Formulary
												</Label>
												<Input
													id='rxSearch'
													onChange={e => setSearchQuery(e.target.value)}
													placeholder='Type generic or brand name (e.g. Amoxicillin, Paracetamol)...'
													value={searchQuery}
												/>
												{formularyResults && formularyResults.length > 0 && (
													<div className='mt-2 max-h-40 overflow-y-auto rounded-lg border border-[var(--oat-border)] bg-[var(--warm-cream)]/50 p-2'>
														{formularyResults.map(drug => {
															const isSelected = rxForm.drugId === drug.id;
															return (
																<button
																	className={`flex w-full cursor-pointer items-center justify-between rounded p-2 text-left text-xs transition-colors ${
																		isSelected
																			? "bg-[var(--matcha-300)] font-bold text-[var(--matcha-900)]"
																			: "text-[var(--clay-black)] hover:bg-[var(--oat-light)]"
																	}`}
																	key={drug.id}
																	onClick={() =>
																		setRxForm(prev => ({
																			...prev,
																			drugId: drug.id,
																			drugName: drug.genericName,
																			category: drug.pharmacologicalCategory,
																			defaultUnit: "mg/kg/day"
																		}))
																	}
																	type='button'
																>
																	<span>{drug.genericName}</span>
																	<span className='text-[var(--warm-charcoal)]/70'>
																		{drug.pharmacologicalCategory}
																	</span>
																</button>
															);
														})}
													</div>
												)}
											</div>

											{rxForm.drugId && (
												<div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950'>
													<p className='font-bold'>{rxForm.drugName}</p>
													<p className='mt-0.5 text-emerald-800'>
														Standard Pediatric Guidance: {rxForm.defaultUnit}
													</p>
												</div>
											)}

											<div className='grid grid-cols-2 gap-4'>
												<div>
													<Label htmlFor='dose'>Dose Amount *</Label>
													<Input
														id='dose'
														min='0.1'
														onChange={e =>
															setRxForm(prev => ({
																...prev,
																doseAmount: e.target.value
															}))
														}
														placeholder='e.g. 250'
														required
														step='0.1'
														type='number'
														value={rxForm.doseAmount}
													/>
												</div>
												<div>
													<Label htmlFor='unit'>Unit</Label>
													<Select
														onValueChange={value =>
															value &&
															setRxForm(prev => ({ ...prev, doseUnit: value }))
														}
														value={rxForm.doseUnit}
													>
														<SelectTrigger id='unit'>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value='mg'>mg</SelectItem>
															<SelectItem value='mL'>mL (Syrup)</SelectItem>
															<SelectItem value='drops'>
																drops (قطرات)
															</SelectItem>
															<SelectItem value='mcg'>mcg</SelectItem>
														</SelectContent>
													</Select>
												</div>
											</div>

											<div className='grid grid-cols-2 gap-4'>
												<div>
													<Label htmlFor='freq'>Frequency</Label>
													<Select
														onValueChange={value =>
															value &&
															setRxForm(prev => ({ ...prev, frequency: value }))
														}
														value={rxForm.frequency}
													>
														<SelectTrigger id='freq'>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value='Q8H'>
																Every 8 hours (3x/day)
															</SelectItem>
															<SelectItem value='Q12H'>
																Every 12 hours (2x/day)
															</SelectItem>
															<SelectItem value='Daily'>Once daily</SelectItem>
															<SelectItem value='PRN'>
																PRN (عند اللزوم للحرارة)
															</SelectItem>
														</SelectContent>
													</Select>
												</div>
												<div>
													<Label htmlFor='dur'>Duration (Days)</Label>
													<Input
														id='dur'
														max='30'
														min='1'
														onChange={e =>
															setRxForm(prev => ({
																...prev,
																durationDays: e.target.value
															}))
														}
														type='number'
														value={rxForm.durationDays}
													/>
												</div>
											</div>

											<div>
												<Label htmlFor='inst'>Instructions for Guardian</Label>
												<Input
													id='inst'
													onChange={e =>
														setRxForm(prev => ({
															...prev,
															instructions: e.target.value
														}))
													}
													placeholder='e.g. After feeding, shake bottle well before use'
													value={rxForm.instructions}
												/>
											</div>

											<DialogFooter>
												<Button
													onClick={() => setRxModalOpen(false)}
													type='button'
													variant='outline'
												>
													Cancel
												</Button>
												<Button
													className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
													disabled={
														!rxForm.drugId ||
														!rxForm.doseAmount ||
														createRxMutation.isPending
													}
													type='submit'
												>
													Prescribe
												</Button>
											</DialogFooter>
										</form>
									</DialogContent>
								</Dialog>
							)}
						</CardHeader>
						<CardContent className='p-0'>
							{(prescriptions ?? []).length === 0 ? (
								<p className='py-6 text-center text-xs text-[var(--warm-charcoal)]/80'>
									No prescriptions issued for this encounter yet.
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Medication</TableHead>
											<TableHead>Dose</TableHead>
											<TableHead>Frequency</TableHead>
											<TableHead>Duration</TableHead>
											<TableHead>Instructions</TableHead>
											{!isCompleted && (
												<TableHead className='text-end'>Action</TableHead>
											)}
										</TableRow>
									</TableHeader>
									<TableBody>
										{(prescriptions ?? []).map(rx => (
											<TableRow key={rx.id}>
												<TableCell className='text-xs font-bold text-[var(--clay-black)]'>
													{rx.medicationName}
												</TableCell>
												<TableCell className='text-xs text-[var(--clay-black)]'>
													{rx.dosage}
												</TableCell>
												<TableCell className='text-xs text-[var(--warm-charcoal)]'>
													{rx.frequency}
												</TableCell>
												<TableCell className='text-xs text-[var(--warm-charcoal)]'>
													{rx.durationDays} days
												</TableCell>
												<TableCell className='text-xs text-[var(--warm-charcoal)]/80'>
													{rx.instructions || "-"}
												</TableCell>
												{!isCompleted && (
													<TableCell className='text-end'>
														<Button
															className='text-red-600 hover:text-red-700'
															disabled={cancelRxMutation.isPending}
															onClick={() =>
																cancelRxMutation.mutateAsync({ id: rx.id })
															}
															size='sm'
															type='button'
															variant='ghost'
														>
															Cancel
														</Button>
													</TableCell>
												)}
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Right Column: AI Clinical Decision Support */}
				<div className='space-y-6'>
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader>
							<div className='flex items-center gap-2'>
								<MaterialIcon
									className='text-purple-600'
									name='psychology'
								/>
								<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
									Pediatric AI Support
								</CardTitle>
							</div>
							<CardDescription>
								Clinical assistance tools designed for pediatric outpatient
								encounters
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-3'>
							<Button
								className='w-full justify-start gap-2 text-start text-xs'
								disabled={soapAi.isPending || isCompleted}
								onClick={handleTriggerSoapAi}
								type='button'
								variant='outline'
							>
								<MaterialIcon
									className='text-purple-600'
									name='auto_awesome'
								/>
								<div>
									<p className='font-bold'>Draft SOAP Note</p>
									<p className='text-[10px] text-[var(--warm-charcoal)]/70'>
										Synthesize bullet notes into formatted SOAP draft
									</p>
								</div>
							</Button>

							<Button
								className='w-full justify-start gap-2 text-start text-xs'
								disabled={parentEdAi.isPending}
								onClick={handleTriggerParentEdAi}
								type='button'
								variant='outline'
							>
								<MaterialIcon
									className='text-emerald-600'
									name='translate'
								/>
								<div>
									<p className='font-bold'>Bilingual Parent Care (عربي)</p>
									<p className='text-[10px] text-[var(--warm-charcoal)]/70'>
										Clear Arabic/English home-care instructions
									</p>
								</div>
							</Button>

							<Link
								className='block'
								to='/prescriptions'
							>
								<Button
									className='w-full justify-start gap-2 text-start text-xs'
									type='button'
									variant='outline'
								>
									<MaterialIcon
										className='text-blue-600'
										name='calculate'
									/>
									<div>
										<p className='font-bold'>Dose Calculator</p>
										<p className='text-[10px] text-[var(--warm-charcoal)]/70'>
											Verify mg/kg/dose weight safety limits
										</p>
									</div>
								</Button>
							</Link>
						</CardContent>
					</Card>

					<div className='rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950'>
						<div className='mb-1 flex items-center gap-1.5 font-bold'>
							<MaterialIcon
								className='text-blue-600'
								name='info'
							/>
							<span>Attribution &amp; Safety</span>
						</div>
						All AI recommendations are decision-support suggestions only. The
						attending pediatrician retains ultimate medical responsibility for
						every prescription, diagnosis, and signed clinical note.
					</div>
				</div>
			</div>
		</div>
	);
}
