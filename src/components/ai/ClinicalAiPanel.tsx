// apps/web/src/components/ai/ClinicalAiPanel.tsx
// Pediatric & Lactation Clinical Decision Support AI Panel (@smart/ai + BullMQ)

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { useAiTrigger } from "@/hooks/use-ai";
import { useAiJobResult } from "@/hooks/use-clinic-store";
import { useAiJobs } from "@/hooks/use-jobs";

export interface SoapDraftOutput {
	subjective?: string;
	objective?: string;
	assessment?: string;
	plan?: string;
}

interface ClinicalAiPanelProps {
	patientId: string;
	visitId?: string;
	patientSex?: "male" | "female";
	patientDateOfBirth?: string;
	patientAgeMonths?: number;
	patientWeightKg?: number;
	gestationalAgeWeeks?: number;
	chiefComplaint?: string;
	onApplySoapDraft?: (draft: SoapDraftOutput) => void;
	onApplyParentInstructions?: (instructions: string) => void;
}

export function ClinicalAiPanel({
	patientId,
	visitId,
	patientSex,
	patientDateOfBirth,
	patientAgeMonths,
	patientWeightKg,
	gestationalAgeWeeks,
	chiefComplaint,
	onApplySoapDraft,
	onApplyParentInstructions
}: ClinicalAiPanelProps) {
	const [activeTab, setActiveTab] = useState<"soap" | "dosing" | "education">(
		"soap"
	);
	const [drugName, setDrugName] = useState("");
	const [dose, setDose] = useState("");
	const [freq, setFreq] = useState("TID");

	const [lastSoapJobId, setLastSoapJobId] = useState<string | null>(null);
	const [lastDosingJobId, setLastDosingJobId] = useState<string | null>(null);
	const [lastEducationJobId, setLastEducationJobId] = useState<string | null>(
		null
	);

	const appliedSoapJobIdRef = useRef<string | null>(null);
	const appliedEducationJobIdRef = useRef<string | null>(null);

	const soapTrigger = useAiTrigger("soap_note");
	const dosingTrigger = useAiTrigger("pediatric_dosing_safety");
	const educationTrigger = useAiTrigger("patient_education");
	const { activeJobs } = useAiJobs();

	const patientContext = useMemo(
		() => ({
			id: patientId,
			sex: patientSex ?? "male",
			dateOfBirth: patientDateOfBirth ?? "2025-01-01",
			ageMonths: patientAgeMonths ?? 0,
			weightKg: patientWeightKg,
			gestationalAgeWeeks
		}),
		[
			patientId,
			patientSex,
			patientDateOfBirth,
			patientAgeMonths,
			patientWeightKg,
			gestationalAgeWeeks
		]
	);

	const completedSoap = useAiJobResult(lastSoapJobId);
	const completedDosing = useAiJobResult(lastDosingJobId);
	const completedEducation = useAiJobResult(lastEducationJobId);

	const isSoapRunning = useMemo(
		() =>
			Boolean(lastSoapJobId && activeJobs.some(j => j.id === lastSoapJobId)),
		[activeJobs, lastSoapJobId]
	);

	const isDosingRunning = useMemo(
		() =>
			Boolean(
				lastDosingJobId && activeJobs.some(j => j.id === lastDosingJobId)
			),
		[activeJobs, lastDosingJobId]
	);

	const isEducationRunning = useMemo(
		() =>
			Boolean(
				lastEducationJobId && activeJobs.some(j => j.id === lastEducationJobId)
			),
		[activeJobs, lastEducationJobId]
	);

	useEffect(() => {
		if (
			!lastSoapJobId ||
			completedSoap?.status !== "completed" ||
			!completedSoap.result ||
			!onApplySoapDraft
		) {
			return;
		}
		if (appliedSoapJobIdRef.current === lastSoapJobId) return;

		const result = completedSoap.result as Record<string, unknown>;
		const raw = (result.data ?? result) as SoapDraftOutput;
		if (raw.subjective || raw.objective || raw.assessment || raw.plan) {
			appliedSoapJobIdRef.current = lastSoapJobId;
			onApplySoapDraft(raw);
		}
	}, [completedSoap, lastSoapJobId, onApplySoapDraft]);

	const extractedEducationText = useMemo(() => {
		if (
			completedEducation?.status !== "completed" ||
			!completedEducation.result
		) {
			return null;
		}
		const result = completedEducation.result as Record<string, unknown>;
		const raw = (result.data ?? result) as Record<string, unknown>;
		if (typeof raw.instructions === "string") return raw.instructions;
		if (typeof raw.text === "string") return raw.text;
		return JSON.stringify(raw, null, 2);
	}, [completedEducation]);

	useEffect(() => {
		if (
			!lastEducationJobId ||
			!extractedEducationText ||
			!onApplyParentInstructions
		) {
			return;
		}
		if (appliedEducationJobIdRef.current === lastEducationJobId) return;

		appliedEducationJobIdRef.current = lastEducationJobId;
		onApplyParentInstructions(extractedEducationText);
	}, [extractedEducationText, lastEducationJobId, onApplyParentInstructions]);

	const handleDraftSoap = async () => {
		const jobId = await soapTrigger.trigger({
			patientId,
			visitId,
			freeText: chiefComplaint,
			language: "ar",
			patient: patientContext
		});

		if (jobId) {
			setLastSoapJobId(jobId);
			toast.info("تم إرسال طلب صياغة SOAP / AI SOAP draft queued", {
				description: "سيتم عرض المسودة للمراجعة الطبية فور اكتمالها."
			});
		}
	};

	const handleCheckDosing = async () => {
		if (!drugName.trim() || !dose.trim()) {
			toast.error("يرجى إدخال اسم الدواء والجرعة المقترحة");
			return;
		}
		if (patientWeightKg == null || patientWeightKg <= 0) {
			toast.error("وزن الطفل (كجم) مطلوب للتحقق من أمان الجرعة");
			return;
		}

		const jobId = await dosingTrigger.trigger({
			patientId,
			visitId,
			language: "ar",
			patient: patientContext,
			dosingQuery: {
				drugName: drugName.trim(),
				proposedDose: dose.trim(),
				frequency: freq.trim() || "TID"
			}
		});

		if (jobId) {
			setLastDosingJobId(jobId);
		}
	};

	const handleGenerateParentInstructions = async () => {
		const jobId = await educationTrigger.trigger({
			patientId,
			visitId,
			freeText: chiefComplaint,
			language: "ar",
			patient: patientContext
		});

		if (jobId) {
			setLastEducationJobId(jobId);
			toast.info("جاري إعداد ورقة إرشادات الأهل وعلامات الخطر");
		}
	};

	const dosingSummaryText = useMemo(() => {
		if (!completedDosing) return null;
		if (completedDosing.status === "failed") {
			return completedDosing.errorMessage || "تعذر إتمام فحص الجرعة.";
		}
		const payload = ((completedDosing.result as Record<string, unknown> | null)
			?.data ?? completedDosing.result) as Record<string, unknown> | null;
		if (!payload) {
			return "اكتمل الفحص — يرجى مراجعة تفاصيل الجرعة في سجل المهام.";
		}
		return typeof payload.summary === "string"
			? payload.summary
			: typeof payload.recommendation === "string"
				? payload.recommendation
				: JSON.stringify(payload, null, 2);
	}, [completedDosing]);

	return (
		<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
			<CardHeader className='pb-3'>
				<div className='flex flex-wrap items-center justify-between gap-2'>
					<div className='flex items-center gap-2'>
						<MaterialIcon
							className='text-amber-500'
							name='auto_awesome'
						/>
						<CardTitle className='text-sm font-bold text-[var(--clay-black)]'>
							مساعد العيادة الذكي / Pediatric Clinical AI
						</CardTitle>
					</div>
					<div className='flex gap-1 rounded-md bg-[var(--oat-light)] p-1 text-xs'>
						<button
							className={`cursor-pointer rounded px-2 py-1 font-medium transition-all ${
								activeTab === "soap"
									? "bg-white text-[var(--clay-black)] shadow-xs"
									: "text-gray-500"
							}`}
							onClick={() => setActiveTab("soap")}
							type='button'
						>
							مسودة SOAP
						</button>
						<button
							className={`cursor-pointer rounded px-2 py-1 font-medium transition-all ${
								activeTab === "dosing"
									? "bg-white text-[var(--clay-black)] shadow-xs"
									: "text-gray-500"
							}`}
							onClick={() => setActiveTab("dosing")}
							type='button'
						>
							أمان الجرعات
						</button>
						<button
							className={`cursor-pointer rounded px-2 py-1 font-medium transition-all ${
								activeTab === "education"
									? "bg-white text-[var(--clay-black)] shadow-xs"
									: "text-gray-500"
							}`}
							onClick={() => setActiveTab("education")}
							type='button'
						>
							إرشادات الأهل
						</button>
					</div>
				</div>
				<CardDescription className='text-xs'>
					Physician-verified decision support &bull;{" "}
					{patientWeightKg ? `Weight: ${patientWeightKg} kg` : "Weight not set"}
					{typeof gestationalAgeWeeks === "number" && gestationalAgeWeeks < 37
						? ` • GA: ${gestationalAgeWeeks}w (Preterm)`
						: ""}
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-3 pt-0 text-xs'>
				{activeTab === "soap" && (
					<div className='space-y-3'>
						<p className='text-gray-600'>
							Draft a structured SOAP clinical encounter or lactation note based
							on recorded triage vitals and chief complaint.
						</p>
						<Button
							className='w-full gap-2 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
							disabled={soapTrigger.isPending || isSoapRunning}
							onClick={handleDraftSoap}
							size='sm'
							type='button'
						>
							<MaterialIcon
								className='text-sm'
								name='edit_note'
							/>
							{soapTrigger.isPending || isSoapRunning
								? "جاري صياغة الملاحظات..."
								: "توليد مسودة فحص إكلينيكي (SOAP Draft)"}
						</Button>
						{completedSoap?.status === "failed" && (
							<div className='rounded border border-red-200 bg-red-50 p-2 text-red-900'>
								{completedSoap.errorMessage || "تعذر توليد مسودة SOAP."}
							</div>
						)}
						{completedSoap?.status === "completed" && (
							<div className='rounded border border-emerald-200 bg-emerald-50 p-2 text-emerald-900'>
								تمت صياغة مسودة SOAP وتطبيقها للمراجعة الطبية.
							</div>
						)}
					</div>
				)}

				{activeTab === "dosing" && (
					<div className='space-y-2'>
						<div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
							<input
								className='rounded border border-gray-300 p-2 text-xs'
								onChange={e => setDrugName(e.target.value)}
								placeholder='Drug (e.g. Amoxicillin)'
								type='text'
								value={drugName}
							/>
							<input
								className='rounded border border-gray-300 p-2 text-xs'
								onChange={e => setDose(e.target.value)}
								placeholder='Dose (e.g. 45 mg/kg/day)'
								type='text'
								value={dose}
							/>
							<input
								className='rounded border border-gray-300 p-2 text-xs'
								onChange={e => setFreq(e.target.value)}
								placeholder='Freq (e.g. BID)'
								type='text'
								value={freq}
							/>
						</div>
						<Button
							className='w-full gap-2'
							disabled={dosingTrigger.isPending || isDosingRunning}
							onClick={handleCheckDosing}
							size='sm'
							type='button'
							variant='outline'
						>
							<MaterialIcon
								className='text-sm'
								name='verified_user'
							/>
							{dosingTrigger.isPending || isDosingRunning
								? "جاري التحقق الإكلينيكي..."
								: `تحقق من سلامة الجرعة (${patientWeightKg ?? "?"} kg)`}
						</Button>
						{dosingSummaryText && (
							<div
								className={`rounded border p-2 text-xs whitespace-pre-wrap ${
									completedDosing?.status === "failed"
										? "border-red-200 bg-red-50 text-red-900"
										: "border-emerald-200 bg-emerald-50 text-emerald-900"
								}`}
							>
								{dosingSummaryText}
							</div>
						)}
					</div>
				)}

				{activeTab === "education" && (
					<div className='space-y-3'>
						<p className='text-gray-600'>
							Generate clear, reassuring discharge guidance in Arabic with
							red-flag emergency symptoms (علامات الخطر).
						</p>
						<Button
							className='w-full gap-2 bg-amber-600 text-white hover:bg-amber-700'
							disabled={educationTrigger.isPending || isEducationRunning}
							onClick={handleGenerateParentInstructions}
							size='sm'
							type='button'
						>
							<MaterialIcon
								className='text-sm'
								name='family_restroom'
							/>
							{educationTrigger.isPending || isEducationRunning
								? "جاري إنشاء الإرشادات..."
								: "إنشاء ورقة إرشادات ولي الأمر"}
						</Button>
						{completedEducation?.status === "failed" && (
							<div className='rounded border border-red-200 bg-red-50 p-2 text-red-900'>
								{completedEducation.errorMessage ||
									"تعذر إنشاء ورقة إرشادات الأهل."}
							</div>
						)}
						{extractedEducationText && (
							<div className='rounded border border-emerald-200 bg-emerald-50 p-2 text-xs whitespace-pre-wrap text-emerald-900'>
								{extractedEducationText}
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
