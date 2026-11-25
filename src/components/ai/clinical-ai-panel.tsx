// apps/web/src/components/ai/ClinicalAiPanel.tsx
// Pediatric & Lactation Clinical Decision Support AI Panel (@smart/ai + BullMQ)

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/material-icon';
import { useAiTrigger } from '@/hooks/use-ai';
import { useAiJobResult } from '@/hooks/use-clinic-store';
import { useAiJobs } from '@/hooks/use-jobs';

export interface SoapDraftOutput {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

const soapDraftOutputSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
});

const soapEnvelopeSchema = z.object({
  data: soapDraftOutputSchema.optional(),
});

const aiTextPayloadSchema = z.object({
  instructions: z.string().optional(),
  text: z.string().optional(),
  summary: z.string().optional(),
  recommendation: z.string().optional(),
});

const aiTextEnvelopeSchema = z.object({
  data: aiTextPayloadSchema.optional(),
});

const hasJobInFlight = (
  jobId: string | null,
  jobs: ReadonlyArray<{ id: string }>,
): boolean =>
  jobId !== null && jobId !== '' && jobs.some((j) => j.id === jobId);

const hasNonEmptySoap = (draft: SoapDraftOutput): boolean =>
  (draft.subjective !== undefined && draft.subjective !== '') ||
  (draft.objective !== undefined && draft.objective !== '') ||
  (draft.assessment !== undefined && draft.assessment !== '') ||
  (draft.plan !== undefined && draft.plan !== '');

interface ClinicalAiPanelProps {
  patientId: string;
  visitId?: string;
  patientSex?: 'male' | 'female';
  patientDateOfBirth?: string;
  patientAgeMonths?: number;
  patientWeightKg?: number;
  gestationalAgeWeeks?: number;
  chiefComplaint?: string;
  onApplySoapDraft?: (draft: SoapDraftOutput) => void;
  onApplyParentInstructions?: (instructions: string) => void;
}

const SoapAiTab = ({
  isBusy,
  onTrigger,
  status,
  errorMessage,
}: {
  isBusy: boolean;
  onTrigger: () => void;
  status?: string;
  errorMessage?: string | null;
}) => (
  <div className="space-y-3">
    <p className="text-muted-foreground">
      Draft a structured SOAP clinical encounter or lactation note based on
      recorded triage vitals and chief complaint.
    </p>
    <Button
      disabled={isBusy}
      onClick={onTrigger}
      size="sm"
      type="button"
      variant="default"
    >
      <span className="inline-flex text-sm">
        <MaterialIcon name="edit_note" />
      </span>
      {isBusy
        ? 'جاري صياغة الملاحظات...'
        : 'توليد مسودة فحص إكلينيكي (SOAP Draft)'}
    </Button>
    {status === 'failed' && (
      <div className="rounded border border-destructive/30 bg-destructive/10 p-2 text-destructive">
        {errorMessage ?? 'تعذر توليد مسودة SOAP.'}
      </div>
    )}
    {status === 'completed' && (
      <div className="rounded border border-brand-success/30 bg-brand-success/10 p-2 text-brand-success">
        تمت صياغة مسودة SOAP وتطبيقها للمراجعة الطبية.
      </div>
    )}
  </div>
);

const DosingAiTab = ({
  drugName,
  dose,
  freq,
  onDrugNameChange,
  onDoseChange,
  onFreqChange,
  patientWeightKg,
  isBusy,
  onCheck,
  summaryText,
  failed,
}: {
  drugName: string;
  dose: string;
  freq: string;
  onDrugNameChange: (val: string) => void;
  onDoseChange: (val: string) => void;
  onFreqChange: (val: string) => void;
  patientWeightKg?: number;
  isBusy: boolean;
  onCheck: () => void;
  summaryText: string | null;
  failed: boolean;
}) => (
  <div className="space-y-2">
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <input
        className="rounded border border-border bg-background p-2 text-xs text-foreground"
        onChange={(e) => onDrugNameChange(e.target.value)}
        placeholder="Drug (e.g. Amoxicillin)"
        type="text"
        value={drugName}
      />
      <input
        className="rounded border border-border bg-background p-2 text-xs text-foreground"
        onChange={(e) => onDoseChange(e.target.value)}
        placeholder="Dose (e.g. 45 mg/kg/day)"
        type="text"
        value={dose}
      />
      <input
        className="rounded border border-border bg-background p-2 text-xs text-foreground"
        onChange={(e) => onFreqChange(e.target.value)}
        placeholder="Freq (e.g. BID)"
        type="text"
        value={freq}
      />
    </div>
    <Button
      disabled={isBusy}
      onClick={onCheck}
      size="sm"
      type="button"
      variant="outline"
    >
      <span className="inline-flex text-sm">
        <MaterialIcon name="verified_user" />
      </span>
      {isBusy
        ? 'جاري التحقق الإكلينيكي...'
        : `تحقق من سلامة الجرعة (${patientWeightKg ?? '?'} kg)`}
    </Button>
    {summaryText !== null && summaryText !== '' && (
      <div
        className={`rounded border p-2 text-xs whitespace-pre-wrap ${
          failed
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : 'border-brand-success/30 bg-brand-success/10 text-brand-success'
        }`}
      >
        {summaryText}
      </div>
    )}
  </div>
);

const EducationAiTab = ({
  isBusy,
  onGenerate,
  status,
  errorMessage,
  extractedText,
}: {
  isBusy: boolean;
  onGenerate: () => void;
  status?: string;
  errorMessage?: string | null;
  extractedText: string | null;
}) => (
  <div className="space-y-3">
    <p className="text-muted-foreground">
      Generate clear, reassuring discharge guidance in Arabic with red-flag
      emergency symptoms (علامات الخطر).
    </p>
    <Button
      disabled={isBusy}
      onClick={onGenerate}
      size="sm"
      type="button"
      variant="secondary"
    >
      <span className="inline-flex text-sm">
        <MaterialIcon name="family_restroom" />
      </span>
      {isBusy ? 'جاري إنشاء الإرشادات...' : 'إنشاء ورقة إرشادات ولي الأمر'}
    </Button>
    {status === 'failed' && (
      <div className="rounded border border-destructive/30 bg-destructive/10 p-2 text-destructive">
        {errorMessage ?? 'تعذر إنشاء ورقة إرشادات الأهل.'}
      </div>
    )}
    {extractedText !== null && extractedText !== '' && (
      <div className="rounded border border-brand-success/30 bg-brand-success/10 p-2 text-xs whitespace-pre-wrap text-brand-success">
        {extractedText}
      </div>
    )}
  </div>
);

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
  onApplyParentInstructions,
}: ClinicalAiPanelProps) {
  const [activeTab, setActiveTab] = useState<'soap' | 'dosing' | 'education'>(
    'soap',
  );

  const [drugName, setDrugName] = useState('');
  const [dose, setDose] = useState('');
  const [freq, setFreq] = useState('TID');

  const [lastSoapJobId, setLastSoapJobId] = useState<string | null>(null);
  const [lastDosingJobId, setLastDosingJobId] = useState<string | null>(null);

  const [lastEducationJobId, setLastEducationJobId] = useState<string | null>(
    null,
  );

  const appliedSoapJobIdRef = useRef<string | null>(null);
  const appliedEducationJobIdRef = useRef<string | null>(null);

  const soapTrigger = useAiTrigger('soap_note');
  const dosingTrigger = useAiTrigger('pediatric_dosing_safety');
  const educationTrigger = useAiTrigger('patient_education');
  const { activeJobs } = useAiJobs();

  const patientContext = useMemo(
    () => ({
      id: patientId,
      sex: patientSex ?? 'male',
      dateOfBirth: patientDateOfBirth ?? '2025-01-01',
      ageMonths: patientAgeMonths ?? 0,
      weightKg: patientWeightKg,
      gestationalAgeWeeks,
    }),
    [
      patientId,
      patientSex,
      patientDateOfBirth,
      patientAgeMonths,
      patientWeightKg,
      gestationalAgeWeeks,
    ],
  );

  const completedSoap = useAiJobResult(lastSoapJobId);
  const completedDosing = useAiJobResult(lastDosingJobId);
  const completedEducation = useAiJobResult(lastEducationJobId);

  const isSoapRunning = useMemo(
    () => hasJobInFlight(lastSoapJobId, activeJobs),
    [activeJobs, lastSoapJobId],
  );

  const isDosingRunning = useMemo(
    () => hasJobInFlight(lastDosingJobId, activeJobs),
    [activeJobs, lastDosingJobId],
  );

  const isEducationRunning = useMemo(
    () => hasJobInFlight(lastEducationJobId, activeJobs),
    [activeJobs, lastEducationJobId],
  );

  useEffect(() => {
    if (
      lastSoapJobId === null ||
      lastSoapJobId === '' ||
      completedSoap?.status !== 'completed' ||
      completedSoap.result === null ||
      onApplySoapDraft === undefined
    ) {
      return;
    }

    if (appliedSoapJobIdRef.current === lastSoapJobId) {
      return;
    }

    const envelope = soapEnvelopeSchema.safeParse(completedSoap.result);

    const candidate =
      envelope.success && envelope.data.data !== undefined
        ? envelope.data.data
        : soapDraftOutputSchema.safeParse(completedSoap.result).data;

    if (candidate !== undefined && hasNonEmptySoap(candidate)) {
      appliedSoapJobIdRef.current = lastSoapJobId;
      onApplySoapDraft(candidate);
    }
  }, [completedSoap, lastSoapJobId, onApplySoapDraft]);

  const extractedEducationText = useMemo(() => {
    if (
      completedEducation?.status !== 'completed' ||
      completedEducation.result === null
    ) {
      return null;
    }

    const envelope = aiTextEnvelopeSchema.safeParse(completedEducation.result);

    const payload =
      envelope.success && envelope.data.data !== undefined
        ? envelope.data.data
        : aiTextPayloadSchema.safeParse(completedEducation.result).data;

    if (payload?.instructions !== undefined && payload.instructions !== '') {
      return payload.instructions;
    }

    if (payload?.text !== undefined && payload.text !== '') {
      return payload.text;
    }

    return JSON.stringify(completedEducation.result, null, 2);
  }, [completedEducation]);

  useEffect(() => {
    if (
      lastEducationJobId === null ||
      lastEducationJobId === '' ||
      extractedEducationText === null ||
      extractedEducationText === '' ||
      onApplyParentInstructions === undefined
    ) {
      return;
    }

    if (appliedEducationJobIdRef.current === lastEducationJobId) {
      return;
    }

    appliedEducationJobIdRef.current = lastEducationJobId;
    onApplyParentInstructions(extractedEducationText);
  }, [extractedEducationText, lastEducationJobId, onApplyParentInstructions]);

  const handleDraftSoap = async () => {
    const jobId = await soapTrigger.trigger({
      patientId,
      visitId,
      freeText: chiefComplaint,
      language: 'ar',
      patient: patientContext,
    });

    if (jobId !== null && jobId !== '') {
      setLastSoapJobId(jobId);
      toast.info('تم إرسال طلب صياغة SOAP / AI SOAP draft queued', {
        description: 'سيتم عرض المسودة للمراجعة الطبية فور اكتمالها.',
      });
    }
  };

  const handleCheckDosing = async () => {
    if (drugName.trim() === '' || dose.trim() === '') {
      toast.error('يرجى إدخال اسم الدواء والجرعة المقترحة');

      return;
    }

    if (patientWeightKg === undefined || patientWeightKg <= 0) {
      toast.error('وزن الطفل (كجم) مطلوب للتحقق من أمان الجرعة');

      return;
    }

    const jobId = await dosingTrigger.trigger({
      patientId,
      visitId,
      language: 'ar',
      patient: patientContext,
      dosingQuery: {
        drugName: drugName.trim(),
        proposedDose: dose.trim(),
        frequency: freq.trim() === '' ? 'TID' : freq.trim(),
      },
    });

    if (jobId !== null && jobId !== '') {
      setLastDosingJobId(jobId);
    }
  };

  const handleGenerateParentInstructions = async () => {
    const jobId = await educationTrigger.trigger({
      patientId,
      visitId,
      freeText: chiefComplaint,
      language: 'ar',
      patient: patientContext,
    });

    if (jobId !== null && jobId !== '') {
      setLastEducationJobId(jobId);
      toast.info('جاري إعداد ورقة إرشادات الأهل وعلامات الخطر');
    }
  };

  const dosingSummaryText = useMemo(() => {
    if (completedDosing === undefined) {
      return null;
    }

    if (completedDosing.status === 'failed') {
      return completedDosing.errorMessage ?? 'تعذر إتمام فحص الجرعة.';
    }

    if (completedDosing.result === null) {
      return 'اكتمل الفحص — يرجى مراجعة تفاصيل الجرعة في سجل المهام.';
    }

    const envelope = aiTextEnvelopeSchema.safeParse(completedDosing.result);

    const payload =
      envelope.success && envelope.data.data !== undefined
        ? envelope.data.data
        : aiTextPayloadSchema.safeParse(completedDosing.result).data;

    if (payload?.summary !== undefined && payload.summary !== '') {
      return payload.summary;
    }

    if (
      payload?.recommendation !== undefined &&
      payload.recommendation !== ''
    ) {
      return payload.recommendation;
    }

    return JSON.stringify(completedDosing.result, null, 2);
  }, [completedDosing]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex text-warning">
              <MaterialIcon name="auto_awesome" />
            </span>
            <CardTitle>مساعد العيادة الذكي / Pediatric Clinical AI</CardTitle>
          </div>
          <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
            <button
              className={`cursor-pointer rounded px-2 py-1 font-medium transition-all ${
                activeTab === 'soap'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setActiveTab('soap')}
              type="button"
            >
              مسودة SOAP
            </button>
            <button
              className={`cursor-pointer rounded px-2 py-1 font-medium transition-all ${
                activeTab === 'dosing'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setActiveTab('dosing')}
              type="button"
            >
              أمان الجرعات
            </button>
            <button
              className={`cursor-pointer rounded px-2 py-1 font-medium transition-all ${
                activeTab === 'education'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setActiveTab('education')}
              type="button"
            >
              إرشادات الأهل
            </button>
          </div>
        </div>
        <CardDescription>
          Physician-verified decision support &bull;{' '}
          {patientWeightKg !== undefined && patientWeightKg > 0
            ? `Weight: ${patientWeightKg} kg`
            : 'Weight not set'}
          {gestationalAgeWeeks !== undefined && gestationalAgeWeeks < 37
            ? ` • GA: ${gestationalAgeWeeks}w (Preterm)`
            : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-xs">
          {activeTab === 'soap' && (
            <SoapAiTab
              errorMessage={completedSoap?.errorMessage}
              isBusy={soapTrigger.isPending || isSoapRunning}
              onTrigger={() => {
                handleDraftSoap().catch(() => null);
              }}
              status={completedSoap?.status}
            />
          )}

          {activeTab === 'dosing' && (
            <DosingAiTab
              dose={dose}
              drugName={drugName}
              failed={completedDosing?.status === 'failed'}
              freq={freq}
              isBusy={dosingTrigger.isPending || isDosingRunning}
              onCheck={() => {
                handleCheckDosing().catch(() => null);
              }}
              onDoseChange={setDose}
              onDrugNameChange={setDrugName}
              onFreqChange={setFreq}
              patientWeightKg={patientWeightKg}
              summaryText={dosingSummaryText}
            />
          )}

          {activeTab === 'education' && (
            <EducationAiTab
              errorMessage={completedEducation?.errorMessage}
              extractedText={extractedEducationText}
              isBusy={educationTrigger.isPending || isEducationRunning}
              onGenerate={() => {
                handleGenerateParentInstructions().catch(() => null);
              }}
              status={completedEducation?.status}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
