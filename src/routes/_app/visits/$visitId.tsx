// apps/web/src/routes/_app.visits.$visitId.tsx

import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { useMemo, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaterialIcon } from '@/components/ui/material-icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAiTrigger } from '@/hooks/use-ai';
import {
  useCancelPrescription,
  useCreatePrescription,
  useFormularySearch,
  usePrescriptionsForVisit,
} from '@/hooks/use-prescriptions';
import { useCompleteVisit, useUpdateVisit, useVisit } from '@/hooks/use-visits';
import { authClient } from '@/lib/auth-client';

const visitSearchSchema = z.object({
  tab: z.enum(['soap', 'prescriptions']).catch('soap').default('soap'),
  rxModal: z.boolean().catch(false).default(false),
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
  chiefComplaint: '',
  symptoms: '',
  physicalExam: '',
  diagnosis: '',
  plan: '',
  notes: '',
};

const createInitialRxState = (
  weightKg?: number | null,
): PrescriptionFormState => {
  const weightHint =
    weightKg !== null && weightKg !== undefined && weightKg > 0
      ? `Patient weight: ${weightKg} kg`
      : '';

  return {
    drugId: null,
    drugName: '',
    category: '',
    defaultUnit: 'mg/kg/day',
    doseAmount: '',
    doseUnit: 'mg',
    frequency: 'TID',
    durationDays: '5',
    instructions: weightHint,
  };
};

const VISIT_TAB_SEARCH = { tab: 'visits' } as const;

const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== '';

interface SoapSectionProps {
  soap: SoapDraft;
  isCompleted: boolean;
  onUpdateSoap: (patch: Partial<SoapDraft>) => void;
}

const VisitSoapSection = ({
  soap,
  isCompleted,
  onUpdateSoap,
}: SoapSectionProps) => (
  <>
    <div className="rounded-xl border border-border bg-card">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="text-base font-bold text-foreground">
              Subjective (S) &bull; الشكوى والتاريخ المرضي
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cc">Chief Complaint (الشكوى الرئيسية)</Label>
              <Input
                disabled={isCompleted}
                id="cc"
                onChange={(e) =>
                  onUpdateSoap({ chiefComplaint: e.target.value })
                }
                placeholder="e.g. Fever for 2 days, poor feeding, cough"
                value={soap.chiefComplaint}
              />
            </div>
            <div>
              <Label htmlFor="hpi">
                History of Present Illness &amp; Feeding
              </Label>
              <Textarea
                disabled={isCompleted}
                id="hpi"
                onChange={(e) => onUpdateSoap({ symptoms: e.target.value })}
                placeholder="Onset, progression, feeding history (breast milk / formula), sleep, stool/urine..."
                rows={3}
                value={soap.symptoms}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="rounded-xl border border-border bg-card">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="text-base font-bold text-foreground">
              Objective (O) &bull; الفحص الإكلينيكي
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="exam">Physical Examination Findings</Label>
          <Textarea
            disabled={isCompleted}
            id="exam"
            onChange={(e) => onUpdateSoap({ physicalExam: e.target.value })}
            placeholder="General appearance, HEENT (throat, ears), Chest (auscultation, wheeze), Heart, Abdomen, Skin rash, Neurological tone..."
            rows={4}
            value={soap.physicalExam}
          />
        </CardContent>
      </Card>
    </div>

    <div className="rounded-xl border border-border bg-card">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="text-base font-bold text-foreground">
              Assessment (A) &bull; التشخيص
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="dx">Primary Diagnosis &amp; ICD-10 Impression</Label>
          <Input
            disabled={isCompleted}
            id="dx"
            onChange={(e) => onUpdateSoap({ diagnosis: e.target.value })}
            placeholder="e.g. Acute Viral Bronchiolitis (J21.9), Acute Otitis Media"
            value={soap.diagnosis}
          />
        </CardContent>
      </Card>
    </div>

    <div className="rounded-xl border border-border bg-card">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="text-base font-bold text-foreground">
              Plan (P) &bull; خطة العلاج وتوجيهات الأهل
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="planText">Management &amp; Counseling Plan</Label>
          <Textarea
            disabled={isCompleted}
            id="planText"
            onChange={(e) => onUpdateSoap({ plan: e.target.value })}
            placeholder="Supportive care, hydration, nasal saline suction, red flags for emergency care..."
            rows={3}
            value={soap.plan}
          />
        </CardContent>
      </Card>
    </div>
  </>
);

interface PrescriptionsSectionProps {
  isCompleted: boolean;
  isRxModalOpen: boolean;
  onRxModalOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  formularyResults: ReturnType<typeof useFormularySearch>['data'];
  rxForm: PrescriptionFormState;
  onUpdateRxForm: (patch: Partial<PrescriptionFormState>) => void;
  onSubmitRx: (e: React.ChangeEvent<HTMLFormElement>) => Promise<void>;
  isCreatingRx: boolean;
  prescriptions: ReturnType<typeof usePrescriptionsForVisit>['data'];
  isCancellingRx: boolean;
  onCancelRx: (id: string) => void;
}

const VisitPrescriptionsSection = ({
  isCompleted,
  isRxModalOpen,
  onRxModalOpenChange,
  searchQuery,
  onSearchQueryChange,
  formularyResults,
  rxForm,
  onUpdateRxForm,
  onSubmitRx,
  isCreatingRx,
  prescriptions,
  isCancellingRx,
  onCancelRx,
}: PrescriptionsSectionProps) => {
  const rxList = prescriptions ?? [];

  return (
    <div className="rounded-xl border border-border bg-card">
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>
                <span className="text-base font-bold text-foreground">
                  Prescribed Medications (الوصفات الدوائية)
                </span>
              </CardTitle>
              <CardDescription>
                Weight-based pediatric prescriptions linked to this visit
              </CardDescription>
            </div>

            {!isCompleted && (
              <Dialog onOpenChange={onRxModalOpenChange} open={isRxModalOpen}>
                <DialogTrigger>
                  <Button size="sm" type="button">
                    <span className="me-1.5 inline-flex">
                      <MaterialIcon name="medication" />
                    </span>
                    <span>Add Medication</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Add Pediatric Prescription</DialogTitle>
                    <DialogDescription>
                      Calculate weight-based dosage from the Egyptian Formulary.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    className="space-y-4 py-2"
                    onSubmit={(e) => {
                      onSubmitRx(e).catch(() => null);
                    }}
                  >
                    <div>
                      <Label htmlFor="rxSearch">
                        Search Medication Formulary
                      </Label>
                      <Input
                        id="rxSearch"
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                        placeholder="Type generic or brand name (e.g. Amoxicillin, Paracetamol)..."
                        value={searchQuery}
                      />
                      {formularyResults !== undefined &&
                        formularyResults.length > 0 && (
                          <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2">
                            {formularyResults.map((drug) => {
                              const isSelected = rxForm.drugId === drug.id;

                              return (
                                <button
                                  className={`flex w-full cursor-pointer items-center justify-between rounded p-2 text-left text-xs transition-colors ${
                                    isSelected
                                      ? 'bg-accent font-bold text-accent-foreground'
                                      : 'text-foreground hover:bg-muted'
                                  }`}
                                  key={drug.id}
                                  onClick={() =>
                                    onUpdateRxForm({
                                      drugId: drug.id,
                                      drugName: drug.genericName,
                                      category: drug.pharmacologicalCategory,
                                      defaultUnit: 'mg/kg/day',
                                    })
                                  }
                                  type="button"
                                >
                                  <span>{drug.genericName}</span>
                                  <span className="text-muted-foreground">
                                    {drug.pharmacologicalCategory}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                    </div>

                    {rxForm.drugId !== null && rxForm.drugId !== '' && (
                      <div className="rounded-lg border border-chart-2/30 bg-chart-2/10 p-3 text-xs text-foreground">
                        <p className="font-bold">{rxForm.drugName}</p>
                        <p className="mt-0.5 text-chart-2">
                          Standard Pediatric Guidance: {rxForm.defaultUnit}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dose">Dose Amount *</Label>
                        <Input
                          id="dose"
                          min="0.1"
                          onChange={(e) =>
                            onUpdateRxForm({ doseAmount: e.target.value })
                          }
                          placeholder="e.g. 250"
                          required
                          step="0.1"
                          type="number"
                          value={rxForm.doseAmount}
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit">Unit</Label>
                        <Select
                          onValueChange={(value) => {
                            if (value !== '') {
                              onUpdateRxForm({ doseUnit: value });
                            }
                          }}
                          value={rxForm.doseUnit}
                        >
                          <SelectTrigger id="unit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mg">mg</SelectItem>
                            <SelectItem value="mL">mL (Syrup)</SelectItem>
                            <SelectItem value="drops">drops (قطرات)</SelectItem>
                            <SelectItem value="mcg">mcg</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="freq">Frequency</Label>
                        <Select
                          onValueChange={(value) => {
                            if (value !== '') {
                              onUpdateRxForm({ frequency: value });
                            }
                          }}
                          value={rxForm.frequency}
                        >
                          <SelectTrigger id="freq">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Q8H">
                              Every 8 hours (3x/day)
                            </SelectItem>
                            <SelectItem value="Q12H">
                              Every 12 hours (2x/day)
                            </SelectItem>
                            <SelectItem value="Daily">Once daily</SelectItem>
                            <SelectItem value="PRN">
                              PRN (عند اللزوم للحرارة)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="dur">Duration (Days)</Label>
                        <Input
                          id="dur"
                          max="30"
                          min="1"
                          onChange={(e) =>
                            onUpdateRxForm({ durationDays: e.target.value })
                          }
                          type="number"
                          value={rxForm.durationDays}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="inst">Instructions for Guardian</Label>
                      <Input
                        id="inst"
                        onChange={(e) =>
                          onUpdateRxForm({ instructions: e.target.value })
                        }
                        placeholder="e.g. After feeding, shake bottle well before use"
                        value={rxForm.instructions}
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        onClick={() => onRxModalOpenChange(false)}
                        type="button"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={
                          rxForm.drugId === null ||
                          rxForm.drugId === '' ||
                          rxForm.doseAmount === '' ||
                          isCreatingRx
                        }
                        type="submit"
                      >
                        Prescribe
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {rxList.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
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
                    <TableHead className="text-end">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rxList.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell>
                      <span className="text-xs font-bold text-foreground">
                        {rx.medicationName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-foreground">
                        {rx.dosage}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {rx.frequency}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {rx.durationDays} days
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {hasText(rx.instructions) ? rx.instructions : '-'}
                      </span>
                    </TableCell>
                    {!isCompleted && (
                      <TableCell className="text-end">
                        <Button
                          disabled={isCancellingRx}
                          onClick={() => onCancelRx(rx.id)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <span className="text-destructive">Cancel</span>
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
  );
};

interface VisitAiSidebarProps {
  isCompleted: boolean;
  soapPending: boolean;
  parentEdPending: boolean;
  onTriggerSoapAi: () => void;
  onTriggerParentEdAi: () => void;
}

const VisitAiSidebar = ({
  isCompleted,
  soapPending,
  parentEdPending,
  onTriggerSoapAi,
  onTriggerParentEdAi,
}: VisitAiSidebarProps) => (
  <div className="space-y-6">
    <div className="rounded-xl border border-border bg-card">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex text-primary">
              <MaterialIcon name="psychology" />
            </span>
            <CardTitle>
              <span className="text-base font-bold text-foreground">
                Pediatric AI Support
              </span>
            </CardTitle>
          </div>
          <CardDescription>
            Clinical assistance tools designed for pediatric outpatient
            encounters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <button
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-start text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              disabled={soapPending || isCompleted}
              onClick={onTriggerSoapAi}
              type="button"
            >
              <span className="inline-flex text-primary">
                <MaterialIcon name="auto_awesome" />
              </span>
              <div>
                <p className="font-bold text-foreground">Draft SOAP Note</p>
                <p className="text-xs text-muted-foreground">
                  Synthesize bullet notes into formatted SOAP draft
                </p>
              </div>
            </button>

            <button
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-start text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              disabled={parentEdPending}
              onClick={onTriggerParentEdAi}
              type="button"
            >
              <span className="inline-flex text-chart-2">
                <MaterialIcon name="translate" />
              </span>
              <div>
                <p className="font-bold text-foreground">
                  Bilingual Parent Care (عربي)
                </p>
                <p className="text-xs text-muted-foreground">
                  Clear Arabic/English home-care instructions
                </p>
              </div>
            </button>

            <Link
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-start text-xs transition-colors hover:bg-muted"
              to="/prescriptions"
            >
              <span className="inline-flex text-chart-6">
                <MaterialIcon name="calculate" />
              </span>
              <div>
                <p className="font-bold text-foreground">Dose Calculator</p>
                <p className="text-xs text-muted-foreground">
                  Verify mg/kg/dose weight safety limits
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="rounded-lg border border-chart-6/30 bg-chart-6/10 p-4 text-xs text-foreground">
      <div className="mb-1 flex items-center gap-1.5 font-bold text-chart-6">
        <span className="inline-flex">
          <MaterialIcon name="info" />
        </span>
        <span>Attribution &amp; Safety</span>
      </div>
      All AI recommendations are decision-support suggestions only. The
      attending pediatrician retains ultimate medical responsibility for every
      prescription, diagnosis, and signed clinical note.
    </div>
  </div>
);

interface VisitHeaderBannerProps {
  patientFullName: string;
  mrn: string;
  weightKg: number | null | undefined;
  status: string;
  isCompleted: boolean;
  isSaving: boolean;
  onSaveDraft: () => void;
  onFinalize: () => void;
}

const VisitHeaderBanner = ({
  patientFullName,
  mrn,
  weightKg,
  status,
  isCompleted,
  isSaving,
  onSaveDraft,
  onFinalize,
}: VisitHeaderBannerProps) => {
  const weightLabel =
    weightKg === null || weightKg === undefined
      ? 'Not measured'
      : `${weightKg} kg`;

  return (
    <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <MaterialIcon name="medical_services" />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Pediatric Clinical Encounter
          </h1>
          <p className="text-xs text-muted-foreground">
            Patient:{' '}
            <strong className="text-foreground">{patientFullName}</strong>{' '}
            &bull; MRN: <strong>{mrn}</strong> &bull; Weight:{' '}
            <strong>{weightLabel}</strong>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
            isCompleted
              ? 'bg-chart-2/15 text-chart-2'
              : 'bg-chart-6/15 text-chart-6'
          }`}
        >
          {status.replace('_', ' ')}
        </span>

        {!isCompleted && (
          <>
            <Button
              disabled={isSaving}
              onClick={onSaveDraft}
              type="button"
              variant="outline"
            >
              Save Draft
            </Button>

            <Button disabled={isSaving} onClick={onFinalize} type="button">
              <span className="me-1.5 inline-flex text-base">
                <MaterialIcon name="check_circle" />
              </span>
              <span>Finalize &amp; Sign</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const VisitEncounterComponent = () => {
  const { visitId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data: visit, isLoading } = useVisit(visitId);
  const updateVisitMutation = useUpdateVisit();
  const completeVisitMutation = useCompleteVisit();

  const { data: prescriptions } = usePrescriptionsForVisit(visitId);
  const createRxMutation = useCreatePrescription();
  const cancelRxMutation = useCancelPrescription();

  const soapAi = useAiTrigger('soap_note');
  const parentEdAi = useAiTrigger('patient_education');

  const [soap, setSoap] = useState<SoapDraft>(EMPTY_SOAP);
  const [syncedVisitKey, setSyncedVisitKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: formularyResults } = useFormularySearch(searchQuery);

  const [rxForm, setRxForm] = useState<PrescriptionFormState>(() =>
    createInitialRxState(null),
  );

  if (visit !== undefined && syncedVisitKey !== visit.id) {
    setSyncedVisitKey(visit.id);
    setSoap({
      chiefComplaint: visit.chiefComplaint ?? '',
      symptoms: visit.symptoms ?? '',
      physicalExam: visit.physicalExam ?? '',
      diagnosis: visit.diagnosis ?? '',
      plan: visit.plan ?? '',
      notes: visit.notes ?? '',
    });
  }

  const isCompleted = visit?.status === 'completed';

  const isSaving =
    updateVisitMutation.isPending || completeVisitMutation.isPending;

  const setRxModalOpen = (open: boolean) => {
    if (open && visit !== undefined) {
      setRxForm(createInitialRxState(visit.patient.weightKg));
      setSearchQuery('');
    }

    navigate({
      search: (prev) => ({ ...prev, rxModal: open }),
      replace: true,
    }).catch(() => null);
  };

  const setActiveTab = (tab: 'soap' | 'prescriptions') => {
    navigate({
      search: (prev) => ({ ...prev, tab }),
      replace: true,
    }).catch(() => null);
  };

  const saveEncounterDraft = async (showToast = true) => {
    await updateVisitMutation.mutateAsync({
      id: visitId,
      patch: soap,
    });

    if (showToast) {
      toast.success('Encounter note saved');
    }
  };

  const handleFinalizeVisit = async () => {
    if (visit === undefined || isCompleted) {
      return;
    }

    await saveEncounterDraft(false);
    await completeVisitMutation.mutateAsync({
      id: visitId,
      patientId: visit.patientId,
    });
    toast.success('Encounter finalized and signed');
  };

  const handleAddPrescriptionSubmit = async (
    e: React.ChangeEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const parsedDose = Number(rxForm.doseAmount);
    const parsedDuration = Math.trunc(Number(rxForm.durationDays));

    const hasValidRxInputs =
      rxForm.drugId !== null &&
      rxForm.drugId !== '' &&
      rxForm.drugName !== '' &&
      parsedDose > 0 &&
      parsedDuration >= 1;

    if (visit === undefined || isCompleted || !hasValidRxInputs) {
      toast.error('Select a medication and enter a valid dose and duration');

      return;
    }

    const trimmedInstructions = rxForm.instructions.trim();

    await createRxMutation.mutateAsync({
      patientId: visit.patientId,
      visitId,
      medicationName: rxForm.drugName,
      dosage: `${parsedDose} ${rxForm.doseUnit}`,
      frequency: rxForm.frequency,
      durationDays: parsedDuration,
      instructions:
        trimmedInstructions === '' ? undefined : trimmedInstructions,
    });

    setRxForm(createInitialRxState(visit.patient.weightKg));
    setSearchQuery('');
    setRxModalOpen(false);
  };

  const handleTriggerSoapAi = async () => {
    if (visit === undefined) {
      return;
    }

    const freeText = [
      `Chief Complaint: ${soap.chiefComplaint}`,
      `Symptoms: ${soap.symptoms}`,
      `Exam: ${soap.physicalExam}`,
      `Diagnosis: ${soap.diagnosis}`,
    ].join('\n');

    await soapAi.trigger({
      patientId: visit.patientId,
      visitId,
      freeText,
    });
    toast.info('AI SOAP draft requested — check Task Monitor for completion');
  };

  const handleTriggerParentEdAi = async () => {
    if (visit === undefined) {
      return;
    }

    await parentEdAi.trigger({
      patientId: visit.patientId,
      visitId,
      freeText: `Diagnosis: ${soap.diagnosis}\nPlan: ${soap.plan}`,
      language: 'ar',
    });
    toast.info('Parent Instructions requested in Arabic');
  };

  const chartLinkParams = useMemo(
    () => ({ patientId: visit?.patientId ?? '' }),
    [visit?.patientId],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (visit === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <span className="inline-flex text-5xl text-muted-foreground/50">
          <MaterialIcon name="receipt_long" />
        </span>
        <h2 className="mt-2 text-lg font-bold text-foreground">
          Encounter Not Found
        </h2>
      </div>
    );
  }

  const joinedName = [visit.patient.firstName, visit.patient.lastName]
    .filter(hasText)
    .join(' ');

  const patientFullName = joinedName === '' ? 'Patient' : joinedName;

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          className="hover:text-foreground"
          params={chartLinkParams}
          search={VISIT_TAB_SEARCH}
          to="/patients/$patientId"
        >
          Patient Chart ({patientFullName})
        </Link>
        <span className="inline-flex text-xs">
          <MaterialIcon name="chevron_right" />
        </span>
        <span className="font-semibold text-foreground">
          Encounter &bull; {new Date(visit.visitedAt).toLocaleDateString()}
        </span>
      </div>

      <VisitHeaderBanner
        isCompleted={isCompleted}
        isSaving={isSaving}
        mrn={visit.patient.mrn}
        onFinalize={() => {
          handleFinalizeVisit().catch(() => null);
        }}
        onSaveDraft={() => {
          saveEncounterDraft(true).catch(() => null);
        }}
        patientFullName={patientFullName}
        status={visit.status}
        weightKg={visit.patient.weightKg}
      />

      {/* Allergy Warning */}
      {hasText(visit.patient.allergies) && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs font-semibold text-warning">
          <span className="inline-flex">
            <MaterialIcon name="warning" />
          </span>
          <span>Known Allergies: {visit.patient.allergies}</span>
        </div>
      )}

      {/* Quick Section Switcher */}
      <div className="mb-6 flex items-center gap-2">
        <Button
          onClick={() => setActiveTab('soap')}
          size="sm"
          type="button"
          variant={search.tab === 'soap' ? 'default' : 'outline'}
        >
          SOAP Note
        </Button>
        <Button
          onClick={() => setActiveTab('prescriptions')}
          size="sm"
          type="button"
          variant={search.tab === 'prescriptions' ? 'default' : 'outline'}
        >
          Prescriptions ({(prescriptions ?? []).length})
        </Button>
      </div>

      {/* 2 Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {search.tab === 'soap' && (
            <VisitSoapSection
              isCompleted={isCompleted}
              onUpdateSoap={(patch) =>
                setSoap((prev) => ({ ...prev, ...patch }))
              }
              soap={soap}
            />
          )}

          <VisitPrescriptionsSection
            formularyResults={formularyResults}
            isCancellingRx={cancelRxMutation.isPending}
            isCompleted={isCompleted}
            isCreatingRx={createRxMutation.isPending}
            isRxModalOpen={search.rxModal}
            onCancelRx={(id) => {
              cancelRxMutation.mutateAsync({ id }).catch(() => null);
            }}
            onRxModalOpenChange={setRxModalOpen}
            onSearchQueryChange={setSearchQuery}
            onSubmitRx={handleAddPrescriptionSubmit}
            onUpdateRxForm={(patch) =>
              setRxForm((prev) => ({ ...prev, ...patch }))
            }
            prescriptions={prescriptions}
            rxForm={rxForm}
            searchQuery={searchQuery}
          />
        </div>

        <VisitAiSidebar
          isCompleted={isCompleted}
          onTriggerParentEdAi={() => {
            handleTriggerParentEdAi().catch(() => null);
          }}
          onTriggerSoapAi={() => {
            handleTriggerSoapAi().catch(() => null);
          }}
          parentEdPending={parentEdAi.isPending}
          soapPending={soapAi.isPending}
        />
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_app/visits/$visitId')({
  validateSearch: visitSearchSchema,
  ssr: 'data-only',
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
      throw redirect({ to: '/login' });
    }

    return { session };
  },
  component: VisitEncounterComponent,
  head: () => ({
    meta: [{ title: 'Pediatric Clinical Encounter — Smart Clinic' }],
  }),
});
