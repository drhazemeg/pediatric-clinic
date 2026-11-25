// apps/web/src/components/forms/fast-patient-check-in-form.tsx
// Fast Pediatric Patient Registration & Clinic Triage Check-In using TanStack Form + Zod

import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useCreatePatient } from '#/hooks/use-patients.ts';
import { useEnqueuePatient } from '#/hooks/use-queue.ts';
import { clinicalActions } from '#/integrations/tanstack-store/clinical-store.ts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface PatientIntakeMetadata {
  bloodType: string;
  guardianRelation: string;
  isPreterm: boolean;
}

const storedSequenceSchema = z.number();

const patientRegistrationSchema = z
  .object({
    fullName: z.string().min(3, 'Full name must be at least 3 characters'),
    dob: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Date of birth required (YYYY-MM-DD)'),
    sex: z.enum(['male', 'female']),
    bloodGroup: z
      .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'])
      .default('UNKNOWN'),
    isPreterm: z.boolean().default(false),
    gestationalAgeWeeks: z
      .number()
      .min(22, 'Gestational age must be at least 22 weeks')
      .max(44, 'Gestational age must be at most 44 weeks')
      .optional(),
    birthWeightKg: z
      .number()
      .min(0.4, 'Birth weight must be at least 0.4 kg')
      .max(7, 'Birth weight must be at most 7.0 kg')
      .optional(),
    guardianName: z.string().min(3, 'Guardian name required'),
    guardianPhone: z.string().min(8, 'Valid contact number required'),
    guardianRelation: z.string().default('Mother'),
    triagePriority: z
      .enum(['ROUTINE', 'URGENT', 'EMERGENCY'])
      .default('ROUTINE'),
    chiefComplaint: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.isPreterm) {
      if (val.gestationalAgeWeeks === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['gestationalAgeWeeks'],
          message: 'Gestational age is required for preterm infants',
        });
      }

      if (val.birthWeightKg === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['birthWeightKg'],
          message: 'Birth weight is required for preterm infants',
        });
      }
    }
  });

interface FastPatientCheckInFormProps {
  clinicId: string;
  onSuccess?: (patientId: string) => void;
  onCancel?: () => void;
}

const PRIORITY_MAP: Record<'ROUTINE' | 'URGENT' | 'EMERGENCY', number> = {
  ROUTINE: 0,
  URGENT: 1,
  EMERGENCY: 2,
};

const MRN_DB_NAME = 'smart-clinic-mrn-sequence';
const MRN_STORE_NAME = 'sequences';
const getTodayIsoDate = (): string => new Date().toISOString().slice(0, 10);

const requestAsPromise = async (
  request: EventTarget & { error: DOMException | null },
): Promise<void> =>
  // oxlint-disable-next-line promise/avoid-new -- IndexedDB IDBRequest exposes DOM events rather than a Promise API.
  await new Promise<void>((resolve, reject) => {
    request.addEventListener('success', () => resolve(), {
      once: true,
    });
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('IndexedDB request failed')),
      { once: true },
    );
  });

const openMrnDb = async (): Promise<IDBDatabase> => {
  const request = indexedDB.open(MRN_DB_NAME, 1);

  request.onupgradeneeded = () => {
    const db = request.result;

    if (!db.objectStoreNames.contains(MRN_STORE_NAME)) {
      db.createObjectStore(MRN_STORE_NAME);
    }
  };

  await requestAsPromise(request);

  return request.result;
};

const allocateNextMrn = async (clinicId: string): Promise<string> => {
  const seqKey = `mrn:${clinicId}`;
  let nextSeq = 1;

  if ('indexedDB' in globalThis) {
    const db = await openMrnDb();
    const tx = db.transaction(MRN_STORE_NAME, 'readwrite');
    const store = tx.objectStore(MRN_STORE_NAME);
    const getRequest: IDBRequest<unknown> = store.get(seqKey);

    await requestAsPromise(getRequest);

    const parsedCurrent = storedSequenceSchema.safeParse(getRequest.result);
    const base = parsedCurrent.success ? parsedCurrent.data : 0;

    nextSeq = base + 1;

    await requestAsPromise(store.put(nextSeq, seqKey));
  }

  const clinicTag = clinicId
    .replaceAll(/[^a-zA-Z0-9]/gu, '')
    .slice(0, 6)
    .toUpperCase();

  return `MRN-${clinicTag || 'CLN'}-${String(nextSeq).padStart(6, '0')}`;
};

const parseOptionalNumber = (raw: string): number | undefined => {
  const trimmed = raw.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : undefined;
};

export const FastPatientCheckInForm = ({
  clinicId,
  onSuccess,
  onCancel,
}: FastPatientCheckInFormProps) => {
  const createPatientMutation = useCreatePatient();
  const enqueueMutation = useEnqueuePatient();

  const [gaInput, setGaInput] = useState('');
  const [bwInput, setBwInput] = useState('');

  const [todayStr, setTodayStr] = useState(getTodayIsoDate);

  const form = useForm({
    defaultValues: {
      fullName: '',
      dob: '',
      // SAFETY: literal narrows to the union the form expects.
      sex: 'male' as 'male' | 'female',
      bloodGroup: 'UNKNOWN',
      isPreterm: false,
      // SAFETY: literal narrows to the union the form expects.
      gestationalAgeWeeks: undefined as number | undefined,
      // SAFETY: literal narrows to the union the form expects.
      birthWeightKg: undefined as number | undefined,
      guardianName: '',
      guardianPhone: '',
      guardianRelation: 'Mother',
      // SAFETY: literal narrows to the union the form expects.
      triagePriority: 'ROUTINE' as 'ROUTINE' | 'URGENT' | 'EMERGENCY',
      chiefComplaint: '',
    },
    onSubmit: async ({ value }) => {
      const candidate = {
        ...value,
        gestationalAgeWeeks: parseOptionalNumber(gaInput),
        birthWeightKg: parseOptionalNumber(bwInput),
      };

      const validation = patientRegistrationSchema.safeParse(candidate);

      if (!validation.success) {
        toast.error('Form Validation Error', {
          description: validation.error.issues[0]?.message,
        });

        return;
      }

      const parsed = validation.data;
      const names = parsed.fullName.trim().split(/\s+/u);
      const firstName = names[0] || 'Child';
      const lastName = names.slice(1).join(' ') || 'Patient';

      let mrn: string;

      try {
        mrn = await allocateNextMrn(clinicId);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to allocate MRN';

        toast.error('MRN Allocation Failed', { description: message });

        return;
      }

      const metadata: PatientIntakeMetadata = {
        bloodType: parsed.bloodGroup,
        guardianRelation: parsed.guardianRelation,
        isPreterm: parsed.isPreterm,
      };

      let newPatient: { id: string };

      try {
        newPatient = await createPatientMutation.create({
          clinicId,
          mrn,
          firstName,
          lastName,
          sex: parsed.sex,
          dateOfBirth: parsed.dob,
          parentName: parsed.guardianName,
          parentPhone: parsed.guardianPhone,
          phone: parsed.guardianPhone,
          gestationalAgeWeeks: parsed.gestationalAgeWeeks,
          birthWeightKg: parsed.birthWeightKg,
          notes: JSON.stringify(metadata),
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to register patient';

        toast.error('Registration Failed', { description: message });

        return;
      }

      const trimmedComplaint = parsed.chiefComplaint?.trim() ?? '';

      const queuePayload = {
        clinicId,
        patientId: newPatient.id,
        priority: PRIORITY_MAP[parsed.triagePriority],
        chiefComplaint:
          trimmedComplaint.length > 0
            ? trimmedComplaint
            : 'Routine Pediatric Consultation',
        isWalkIn: true,
      };

      try {
        await enqueueMutation.mutateAsync(queuePayload);
        toast.success('Patient Checked In', {
          description: `${parsed.fullName} added to triage queue (MRN: ${mrn})`,
        });
      } catch (error: unknown) {
        clinicalActions.enqueueMutation({
          entityType: 'queue',
          action: 'create',
          payload: queuePayload,
        });

        const reason =
          error instanceof Error ? error.message : 'Queue unavailable';

        toast.warning('Patient saved, queue sync pending', {
          description: `${parsed.fullName} (MRN: ${mrn}) saved; queued for sync (${reason})`,
        });
      }

      form.reset();
      setGaInput('');
      setBwInput('');
      onSuccess?.(newPatient.id);
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {/* Child Name & DOB */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <form.Field name="fullName">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="patient-name">
                اسم الطفل بالكامل / Child Name{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="patient-name"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. Youssef Ahmed / يوسف أحمد"
                required
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="dob">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="patient-dob">
                تاريخ الميلاد / Date of Birth{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="patient-dob"
                max={todayStr}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                onFocus={() => setTodayStr(getTodayIsoDate())}
                placeholder="YYYY-MM-DD"
                required
                type="date"
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
      </div>

      {/* Sex & Blood Group */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <form.Field name="sex">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="patient-sex">النوع / Sex</Label>
              <Select
                onValueChange={(val) => {
                  if (val === 'male' || val === 'female') {
                    field.handleChange(val);
                  }
                }}
                value={field.state.value}
              >
                <SelectTrigger id="patient-sex">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر / Male</SelectItem>
                  <SelectItem value="female">أنثى / Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>

        <form.Field name="bloodGroup">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="patient-blood">فصيلة الدم / Blood Group</Label>
              <Select
                onValueChange={(val) => {
                  if (val !== '') {
                    field.handleChange(val);
                  }
                }}
                value={field.state.value}
              >
                <SelectTrigger id="patient-blood">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNKNOWN">غير معروف / Unknown</SelectItem>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
      </div>

      {/* Neonatal: Preterm Toggle + Gestational Age & Birth Weight */}
      <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
        <form.Field name="isPreterm">
          {(field) => (
            <label
              className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground"
              htmlFor="patient-preterm-toggle"
            >
              <input
                checked={field.state.value}
                className="h-4 w-4 rounded border-input"
                id="patient-preterm-toggle"
                name={field.name}
                onChange={(e) => field.handleChange(e.target.checked)}
                type="checkbox"
              />
              <span>
                خديج / مبتسر — Preterm (&lt; 37 weeks, requires GA &amp; birth
                weight)
              </span>
            </label>
          )}
        </form.Field>

        <form.Subscribe selector={(s) => s.values.isPreterm}>
          {(isPreterm) => (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="patient-ga">
                  عمر الحمل عند الولادة / Gestational Age (Weeks)
                  {isPreterm && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id="patient-ga"
                  max={44}
                  min={22}
                  name="gestationalAgeWeeks"
                  onChange={(e) => setGaInput(e.target.value)}
                  placeholder="Optional (e.g. 36)"
                  required={isPreterm}
                  step="0.1"
                  type="number"
                  value={gaInput}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="patient-bw">
                  وزن الولادة / Birth Weight (kg)
                  {isPreterm && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id="patient-bw"
                  max={7}
                  min={0.4}
                  name="birthWeightKg"
                  onChange={(e) => setBwInput(e.target.value)}
                  placeholder="Optional (e.g. 2.45)"
                  required={isPreterm}
                  step="0.05"
                  type="number"
                  value={bwInput}
                />
              </div>
            </div>
          )}
        </form.Subscribe>
      </div>

      {/* Guardian Contact Info */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <form.Field name="guardianName">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="guardian-name">
                اسم ولي الأمر / Guardian Name{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="guardian-name"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Parent Full Name"
                required
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="guardianPhone">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="guardian-phone">
                رقم الهاتف / Phone Number{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="guardian-phone"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="01xxxxxxxxx"
                required
                type="tel"
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="guardianRelation">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="guardian-rel">صلة القرابة / Relation</Label>
              <Select
                onValueChange={(val) => {
                  if (val !== '') {
                    field.handleChange(val);
                  }
                }}
                value={field.state.value}
              >
                <SelectTrigger id="guardian-rel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mother">الأم / Mother</SelectItem>
                  <SelectItem value="Father">الأب / Father</SelectItem>
                  <SelectItem value="Grandmother">
                    الجدة / Grandmother
                  </SelectItem>
                  <SelectItem value="Guardian">ولي أمر / Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
      </div>

      {/* Triage Priority & Chief Complaint */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <form.Field name="triagePriority">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="triage-priority">
                أولوية الفرز / Triage Priority
              </Label>
              <Select
                onValueChange={(val) => {
                  if (
                    val === 'ROUTINE' ||
                    val === 'URGENT' ||
                    val === 'EMERGENCY'
                  ) {
                    field.handleChange(val);
                  }
                }}
                value={field.state.value}
              >
                <SelectTrigger id="triage-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">عادي / Routine</SelectItem>
                  <SelectItem value="URGENT">
                    عاجل / Urgent (Fever / Respiratory)
                  </SelectItem>
                  <SelectItem value="EMERGENCY">
                    طارئ / STAT Emergency (NICU / Dehydration)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>

        <div className="sm:col-span-2">
          <form.Field name="chiefComplaint">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="chief-complaint">
                  الشكوى الرئيسية / Chief Complaint &amp; Triage Notes
                </Label>
                <Textarea
                  id="chief-complaint"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. High fever for 2 days, poor feeding, frequent coughing..."
                  rows={2}
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button onClick={onCancel} type="button" variant="outline">
            إلغاء / Cancel
          </Button>
        )}
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              disabled={
                !canSubmit ||
                isSubmitting ||
                createPatientMutation.isPending ||
                enqueueMutation.isPending
              }
              type="submit"
            >
              {isSubmitting ||
              createPatientMutation.isPending ||
              enqueueMutation.isPending
                ? 'جاري التسجيل...'
                : 'تسجيل وتأكيد الدخول / Check-In'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
};
