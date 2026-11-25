// apps/web/src/routes/_app/patients.$patientId.tsx

import type { GrowthCurvePoint } from '@/components/growth/growth-percentile-chart';
import type { GrowthIndicatorOption } from '@/lib/features/development';
import type { ChangeEvent } from 'react';

import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { GrowthPercentileChart } from '@/components/growth/growth-percentile-chart';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveClinicId } from '@/hooks/use-active-clinic';
import {
  useGrowthCurves,
  useLatestPanel,
  usePatientMeasurements,
  useRecordMeasurement,
} from '@/hooks/use-growth';
import {
  usePatientImmunizations,
  useRecordImmunization,
} from '@/hooks/use-immunizations';
import { useLinkGuardian, usePatient } from '@/hooks/use-patients';
import { useEnqueuePatient } from '@/hooks/use-queue';
import { authClient } from '@/lib/auth-client';
import { INDICATOR_LABELS } from '@/lib/features/development';
import { patientChartSearchSchema } from '@/lib/web/route-search-schemas';
import { routeShell } from '@/lib/web/route-shell';
import { calculateAgeString, getTargetAgeMonths } from '@/utils/age';

const getAgeInMonths = (dateOfBirth: string): number => {
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();

  return Math.max(
    0,
    (today.getFullYear() - birthDate.getFullYear()) * 12 +
      today.getMonth() -
      birthDate.getMonth() -
      (today.getDate() < birthDate.getDate() ? 1 : 0),
  );
};

const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== '';

const isGrowthIndicatorOption = (
  value: string,
): value is GrowthIndicatorOption =>
  value === 'weight-for-age' ||
  value === 'length-for-age' ||
  value === 'head-circumference-for-age' ||
  value === 'bmi-for-age' ||
  value === 'weight-for-length';

interface MetricSummary {
  value?: number | null;
  percentile?: number | null;
}

const formatMetricValue = (
  metric: MetricSummary | undefined,
  unitSuffix: string,
  decimals?: number,
): string => {
  if (metric?.value === undefined || metric.value === null) {
    return '-';
  }

  const formatted =
    decimals === undefined
      ? String(metric.value)
      : metric.value.toFixed(decimals);

  return unitSuffix === '' ? formatted : `${formatted} ${unitSuffix}`;
};

const formatPercentileText = (metric: MetricSummary | undefined): string => {
  if (metric?.percentile === undefined || metric.percentile === null) {
    return 'No percentile';
  }

  return `P${metric.percentile.toFixed(0)} (WHO)`;
};

type PatientData = NonNullable<ReturnType<typeof usePatient>['data']>;

type PatientMeasurements = NonNullable<
  ReturnType<typeof usePatientMeasurements>['data']
>;

type PatientImmunizations = NonNullable<
  ReturnType<typeof usePatientImmunizations>['data']
>;

const VisitHistoryRow = ({
  visit,
}: {
  visit: NonNullable<PatientData['visits']>[number];
}) => {
  const linkParams = useMemo(() => ({ visitId: visit.id }), [visit.id]);

  return (
    <div className="flex items-center justify-between py-3.5">
      <div>
        <p className="text-base font-bold text-foreground">
          {hasText(visit.chiefComplaint)
            ? visit.chiefComplaint
            : 'Routine Pediatric Visit'}
        </p>
        <p className="text-xs text-muted-foreground">
          Visited:{' '}
          {new Date(visit.visitedAt).toLocaleDateString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}{' '}
          &bull; Status: <strong className="uppercase">{visit.status}</strong>
        </p>
        {hasText(visit.plan) && (
          <p className="mt-1 text-xs text-foreground/85">Plan: {visit.plan}</p>
        )}
      </div>
      <Link params={linkParams} to="/visits/$visitId">
        <Button size="sm" type="button" variant="outline">
          Open SOAP Note
        </Button>
      </Link>
    </div>
  );
};

const GrowthKpiCard = ({
  title,
  metric,
  unitSuffix,
  decimals,
}: {
  title: string;
  metric: MetricSummary | undefined;
  unitSuffix: string;
  decimals?: number;
}) => (
  <div className="rounded-xl border border-border bg-card">
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="text-xs font-semibold text-muted-foreground uppercase">
            {title}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-bold text-foreground">
          {formatMetricValue(metric, unitSuffix, decimals)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatPercentileText(metric)}
        </p>
      </CardContent>
    </Card>
  </div>
);

const PatientVisitsTab = ({
  visits,
}: {
  visits: PatientData['visits'] | undefined;
}) => {
  const visitList = visits ?? [];

  return (
    <div className="mt-4 rounded-xl border border-border bg-card">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="text-lg font-bold text-foreground">
              Encounter History (الزيارات الطبية)
            </span>
          </CardTitle>
          <CardDescription>
            Outpatient consultations, lactation notes, and physician assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visitList.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No clinical visits documented yet for this patient.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visitList.map((visit) => (
                <VisitHistoryRow key={visit.id} visit={visit} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface PatientGrowthTabProps {
  isMeasureOpen: boolean;
  onMeasureOpenChange: (open: boolean) => void;
  indicator: GrowthIndicatorOption;
  onIndicatorChange: (ind: GrowthIndicatorOption) => void;
  measureValue: string;
  onMeasureValueChange: (val: string) => void;
  onSubmitMeasurement: (e: ChangeEvent<HTMLFormElement>) => Promise<void>;
  isSubmittingMeasurement: boolean;
  latestPanel: ReturnType<typeof useLatestPanel>['data'];
  mappedChildMeasurements: Array<{ ageMonths: number; value: number }>;
  mappedCurvePoints: Array<GrowthCurvePoint>;
  patientSex: 'male' | 'female';
  activeIndicatorMeta: { label: string; unit: string };
  measurements: PatientMeasurements | undefined;
}

const PatientGrowthTab = ({
  isMeasureOpen,
  onMeasureOpenChange,
  indicator,
  onIndicatorChange,
  measureValue,
  onMeasureValueChange,
  onSubmitMeasurement,
  isSubmittingMeasurement,
  latestPanel,
  mappedChildMeasurements,
  mappedCurvePoints,
  patientSex,
  activeIndicatorMeta,
  measurements,
}: PatientGrowthTabProps) => {
  const measurementList = measurements ?? [];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-foreground">
          Anthropometric Measurements &amp; Growth Chart
        </h3>
        <Dialog onOpenChange={onMeasureOpenChange} open={isMeasureOpen}>
          <DialogTrigger>
            <Button size="sm" type="button">
              <span className="me-1.5 inline-flex">
                <MaterialIcon name="add_circle" />
              </span>
              <span>Record Measurement</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Anthropometric Measurement</DialogTitle>
              <DialogDescription>
                Add weight, length, head circumference, or BMI for WHO &amp;
                Egyptian LMS tracking.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4 py-2"
              onSubmit={(e) => {
                onSubmitMeasurement(e).catch(() => null);
              }}
            >
              <div>
                <Label htmlFor="indicator">Indicator</Label>
                <Select
                  onValueChange={(v) => {
                    if (isGrowthIndicatorOption(v)) {
                      onIndicatorChange(v);
                    }
                  }}
                  value={indicator}
                >
                  <SelectTrigger id="indicator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight-for-age">Weight (kg)</SelectItem>
                    <SelectItem value="length-for-age">
                      Length / Height (cm)
                    </SelectItem>
                    <SelectItem value="head-circumference-for-age">
                      Head Circumference (cm)
                    </SelectItem>
                    <SelectItem value="bmi-for-age">BMI (kg/m²)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="measureVal">Value</Label>
                <Input
                  id="measureVal"
                  onChange={(e) => onMeasureValueChange(e.target.value)}
                  placeholder="e.g. 7.5"
                  required
                  step="0.01"
                  type="number"
                  value={measureValue}
                />
              </div>

              <DialogFooter>
                <Button
                  onClick={() => onMeasureOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={isSubmittingMeasurement} type="submit">
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GrowthKpiCard
          metric={latestPanel?.['weight-for-age'] ?? undefined}
          title="Weight"
          unitSuffix="kg"
        />
        <GrowthKpiCard
          metric={latestPanel?.['length-for-age'] ?? undefined}
          title="Length / Height"
          unitSuffix="cm"
        />
        <GrowthKpiCard
          metric={latestPanel?.['head-circumference-for-age'] ?? undefined}
          title="Head Circumference"
          unitSuffix="cm"
        />
        <GrowthKpiCard
          decimals={1}
          metric={latestPanel?.['bmi-for-age'] ?? undefined}
          title="BMI"
          unitSuffix=""
        />
      </div>

      <GrowthPercentileChart
        childMeasurements={mappedChildMeasurements}
        curveData={mappedCurvePoints}
        indicator={indicator}
        sex={patientSex}
        standard="who"
        title={activeIndicatorMeta.label}
        unit={activeIndicatorMeta.unit}
      />

      <div className="rounded-xl border border-border bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="text-base font-bold text-foreground">
                Recorded Measurements
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {measurementList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
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
                  {measurementList.map((m, idx) => (
                    <TableRow key={`${m.day}-${m.value}-${idx}`}>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          Day {m.day} (~{(m.day / 30.43).toFixed(1)} mo)
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-foreground capitalize">
                          {activeIndicatorMeta.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-foreground">
                          {m.value} {activeIndicatorMeta.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          Clinic Chart
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface PatientImmunizationsTabProps {
  isImmuneOpen: boolean;
  onImmuneOpenChange: (open: boolean) => void;
  vaccineCode: string;
  onVaccineCodeChange: (code: string) => void;
  doseNum: string;
  onDoseNumChange: (dose: string) => void;
  lotNumber: string;
  onLotNumberChange: (lot: string) => void;
  onSubmitImmune: (e: ChangeEvent<HTMLFormElement>) => Promise<void>;
  isSubmittingImmune: boolean;
  immunizations: PatientImmunizations | undefined;
}

const PatientImmunizationsTab = ({
  isImmuneOpen,
  onImmuneOpenChange,
  vaccineCode,
  onVaccineCodeChange,
  doseNum,
  onDoseNumChange,
  lotNumber,
  onLotNumberChange,
  onSubmitImmune,
  isSubmittingImmune,
  immunizations,
}: PatientImmunizationsTabProps) => {
  const immunizationList = immunizations ?? [];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Immunization History &amp; Routine Schedule
          </h3>
          <p className="text-xs text-muted-foreground">
            Egyptian Ministry of Health childhood routine vaccination schedule
          </p>
        </div>
        <Dialog onOpenChange={onImmuneOpenChange} open={isImmuneOpen}>
          <DialogTrigger>
            <Button size="sm" type="button">
              <span className="me-1.5 inline-flex">
                <MaterialIcon name="vaccines" />
              </span>
              <span>Record Immunization</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Administer / Record Immunization</DialogTitle>
              <DialogDescription>
                Log vaccine administration in the child&apos;s official clinical
                record.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4 py-2"
              onSubmit={(e) => {
                onSubmitImmune(e).catch(() => null);
              }}
            >
              <div>
                <Label htmlFor="vaxCode">Vaccine</Label>
                <Select
                  onValueChange={(val) => {
                    if (val !== '') {
                      onVaccineCodeChange(val);
                    }
                  }}
                  value={vaccineCode}
                >
                  <SelectTrigger id="vaxCode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BCG">
                      BCG (Tuberculosis - Birth)
                    </SelectItem>
                    <SelectItem value="HepB_Birth">
                      Hepatitis B (Birth dose)
                    </SelectItem>
                    <SelectItem value="Pentavalent">
                      Pentavalent (DTP-HepB-Hib)
                    </SelectItem>
                    <SelectItem value="OPV">OPV (Oral Polio)</SelectItem>
                    <SelectItem value="IPV">IPV (Inactivated Polio)</SelectItem>
                    <SelectItem value="MMR">
                      MMR (Measles-Mumps-Rubella)
                    </SelectItem>
                    <SelectItem value="VitA">Vitamin A Capsule</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="doseNum">Dose Number</Label>
                <Input
                  id="doseNum"
                  max="5"
                  min="1"
                  onChange={(e) => onDoseNumChange(e.target.value)}
                  required
                  type="number"
                  value={doseNum}
                />
              </div>

              <div>
                <Label htmlFor="lotNum">Batch / Lot Number</Label>
                <Input
                  id="lotNum"
                  onChange={(e) => onLotNumberChange(e.target.value)}
                  placeholder="e.g. LOT-2026-X9"
                  value={lotNumber}
                />
              </div>

              <DialogFooter>
                <Button
                  onClick={() => onImmuneOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={isSubmittingImmune} type="submit">
                  Confirm Administration
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Card>
          <CardContent>
            {immunizationList.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
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
                  {immunizationList.map((im) => {
                    const administeredLabel =
                      im.administeredDate === null
                        ? '-'
                        : new Date(im.administeredDate).toLocaleDateString();

                    const lotLabel = hasText(im.lotNumber) ? im.lotNumber : '-';

                    return (
                      <TableRow key={im.id}>
                        <TableCell>
                          <span className="text-xs font-bold text-foreground">
                            {im.vaccineName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            #{im.doseNumber}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {administeredLabel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {lotLabel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="rounded bg-chart-2/15 px-2 py-0.5 text-xs font-semibold text-chart-2">
                            Administered
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface PatientGuardiansTabProps {
  isGuardianOpen: boolean;
  onGuardianOpenChange: (open: boolean) => void;
  guardianName: string;
  onGuardianNameChange: (name: string) => void;
  guardianRelation: string;
  onGuardianRelationChange: (rel: string) => void;
  guardianPhone: string;
  onGuardianPhoneChange: (phone: string) => void;
  onSubmitGuardian: (e: ChangeEvent<HTMLFormElement>) => Promise<void>;
  isSubmittingGuardian: boolean;
  patient: PatientData;
}

const PatientGuardiansTab = ({
  isGuardianOpen,
  onGuardianOpenChange,
  guardianName,
  onGuardianNameChange,
  guardianRelation,
  onGuardianRelationChange,
  guardianPhone,
  onGuardianPhoneChange,
  onSubmitGuardian,
  isSubmittingGuardian,
  patient,
}: PatientGuardiansTabProps) => {
  const primaryName = hasText(patient.parentName)
    ? patient.parentName
    : 'Primary Guardian';

  let primaryPhone = 'None';

  if (hasText(patient.phone)) {
    primaryPhone = patient.phone;
  } else if (hasText(patient.parentPhone)) {
    primaryPhone = patient.parentPhone;
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Guardians &amp; Authorized Contacts
          </h3>
          <p className="text-xs text-muted-foreground">
            Family members authorized for pediatric &amp; lactation care
            decisions and notifications
          </p>
        </div>

        <Dialog onOpenChange={onGuardianOpenChange} open={isGuardianOpen}>
          <DialogTrigger>
            <Button size="sm" type="button">
              <span className="me-1.5 inline-flex">
                <MaterialIcon name="person_add" />
              </span>
              <span>Link Guardian</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Guardian / Parent</DialogTitle>
              <DialogDescription>
                Add authorized parent or legal guardian details.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4 py-2"
              onSubmit={(e) => {
                onSubmitGuardian(e).catch(() => null);
              }}
            >
              <div>
                <Label htmlFor="gName">Full Name *</Label>
                <Input
                  id="gName"
                  onChange={(e) => onGuardianNameChange(e.target.value)}
                  placeholder="e.g. Fatima Mahmoud"
                  required
                  value={guardianName}
                />
              </div>
              <div>
                <Label htmlFor="gRel">Relationship</Label>
                <Select
                  onValueChange={(val) => {
                    if (val !== '') {
                      onGuardianRelationChange(val);
                    }
                  }}
                  value={guardianRelation}
                >
                  <SelectTrigger id="gRel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother">Mother (أم)</SelectItem>
                    <SelectItem value="father">Father (أب)</SelectItem>
                    <SelectItem value="guardian">
                      Legal Guardian (وصي)
                    </SelectItem>
                    <SelectItem value="relative">Relative (قريب)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="gPhone">Phone Number</Label>
                <Input
                  id="gPhone"
                  onChange={(e) => onGuardianPhoneChange(e.target.value)}
                  placeholder="010xxxxxxxx"
                  value={guardianPhone}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => onGuardianOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={isSubmittingGuardian} type="submit">
                  Link
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-bold text-foreground">
                  {primaryName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Primary contact &bull; Phone: {primaryPhone}
                </p>
              </div>
              <span className="rounded bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                Primary
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface PatientHeaderCardProps {
  patient: PatientData;
  isBoy: boolean;
  isPreterm: boolean;
  isEnqueuing: boolean;
  onEnqueue: () => void;
}

const PatientHeaderCard = ({
  patient,
  isBoy,
  isPreterm,
  isEnqueuing,
  onEnqueue,
}: PatientHeaderCardProps) => {
  const weightLabel =
    patient.weightKg === null ? 'Not recorded' : `${patient.weightKg} kg`;

  const gaLabel =
    patient.gestationalAgeWeeks === null
      ? 'Term'
      : `${patient.gestationalAgeWeeks} weeks`;

  const bwLabel =
    patient.birthWeightKg === null ? '-' : `${patient.birthWeightKg} kg`;

  let guardianSummary = 'No contact';

  if (hasText(patient.parentName)) {
    guardianSummary = patient.parentName;
  } else if (hasText(patient.phone)) {
    guardianSummary = patient.phone;
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
              isBoy
                ? 'bg-chart-6/15 text-chart-6'
                : 'bg-destructive/15 text-destructive'
            }`}
          >
            {isBoy ? '♂' : '♀'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {patient.firstName} {patient.lastName}
              </h1>
              <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                MRN: {patient.mrn}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              DOB: <strong>{patient.dateOfBirth}</strong> &bull; Age:{' '}
              <strong>{calculateAgeString(patient.dateOfBirth)}</strong> &bull;
              Sex: <strong className="capitalize">{patient.sex}</strong>
              {isPreterm && (
                <span className="ml-2 rounded bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                  Preterm — Verify corrected age
                </span>
              )}
            </p>
          </div>
        </div>

        <Button disabled={isEnqueuing} onClick={onEnqueue} type="button">
          <span className="me-1.5 inline-flex">
            <MaterialIcon name="person_check" />
          </span>
          <span>Add to Waiting Queue</span>
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4 lg:grid-cols-5">
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Current Weight
          </span>
          <p className="text-base font-bold text-foreground">{weightLabel}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Gestational Age (GA)
          </span>
          <p className="text-base font-bold text-foreground">{gaLabel}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Birth Weight
          </span>
          <p className="text-base font-bold text-foreground">{bwLabel}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Guardian / Phone
          </span>
          <p className="text-sm font-medium text-foreground">
            {guardianSummary}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Allergies Alert
          </span>
          {hasText(patient.allergies) ? (
            <p className="rounded bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
              ⚠️ {patient.allergies}
            </p>
          ) : (
            <p className="text-xs font-semibold text-chart-2">
              No known allergies
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const PatientChartComponent = () => {
  const { patientId } = Route.useParams();
  const { doctorId } = Route.useRouteContext();
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
    useState<GrowthIndicatorOption>('weight-for-age');

  const [measureValue, setMeasureValue] = useState('');

  const [isImmuneOpen, setIsImmuneOpen] = useState(false);
  const [vaccineCode, setVaccineCode] = useState('BCG');
  const [doseNum, setDoseNum] = useState('1');
  const [lotNumber, setLotNumber] = useState('');

  const [isGuardianOpen, setIsGuardianOpen] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('mother');
  const [guardianPhone, setGuardianPhone] = useState('');

  const patientSex: 'male' | 'female' =
    patient?.sex === 'female' ? 'female' : 'male';

  const isBoy = patientSex === 'male';

  const isPreterm =
    patient?.gestationalAgeWeeks !== null &&
    patient?.gestationalAgeWeeks !== undefined &&
    patient.gestationalAgeWeeks < 37;

  const { data: growthCurve } = useGrowthCurves(indicator, patientSex, 0, 24);

  const mappedCurvePoints = useMemo<Array<GrowthCurvePoint>>(() => {
    const pts = growthCurve?.points ?? [];

    return pts.map((p) => ({
      ageMonths: p.x,
      p3: p.sd2neg,
      p15: p.sd1neg,
      p50: p.median,
      p85: p.sd1,
      p97: p.sd2,
    }));
  }, [growthCurve]);

  const mappedChildMeasurements = useMemo(
    () =>
      (measurements ?? []).map((m) => ({
        ageMonths: Number((m.day / 30.4375).toFixed(1)),
        value: m.value,
      })),
    [measurements],
  );

  const handleRecordMeasureSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedValue = Number(measureValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return;
    }

    const firstVisit = patient?.visits.at(0);

    if (firstVisit === undefined || patient === undefined) {
      return;
    }

    await recordMeasurementMutation.mutateAsync({
      patientId,
      visitId: firstVisit.id,
      indicator,
      value: parsedValue,
      sex: patient.sex,
      ageMonths: getAgeInMonths(patient.dateOfBirth),
    });

    setMeasureValue('');
    setIsMeasureOpen(false);
  };

  const handleRecordImmuneSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedDose = Math.trunc(Number(doseNum));

    const safeDose =
      Number.isFinite(parsedDose) && parsedDose > 0 ? parsedDose : 1;

    const trimmedLot = lotNumber.trim();

    await recordImmuneMutation.mutateAsync({
      patientId,
      vaccineKey: vaccineCode,
      vaccineName: vaccineCode,
      targetAgeMonths: getTargetAgeMonths(vaccineCode, safeDose),
      doseNumber: safeDose,
      lotNumber: trimmedLot === '' ? undefined : trimmedLot,
      administeredDate: new Date(),
    });

    setLotNumber('');
    setIsImmuneOpen(false);
  };

  const handleLinkGuardianSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (guardianName.trim() === '' || doctorId === '') {
      return;
    }

    await linkGuardianMutation.link({
      patientId,
      userId: doctorId,
      guardianName: guardianName.trim(),
      phone: guardianPhone.trim(),
      relation: guardianRelation === '' ? 'mother' : guardianRelation,
      isPrimary: true,
    });

    setGuardianName('');
    setGuardianPhone('');
    setIsGuardianOpen(false);
  };

  if (isPatientLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (patient === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <span className="inline-flex text-5xl text-muted-foreground/50">
          <MaterialIcon name="sentiment_dissatisfied" />
        </span>
        <h2 className="mt-3 text-lg font-bold text-foreground">
          Patient Chart Not Found
        </h2>
        <p className="text-sm text-muted-foreground">
          The requested patient record could not be loaded.
        </p>
        <Link className="mt-4 inline-block" to="/patients">
          <Button type="button" variant="outline">
            Back to Directory
          </Button>
        </Link>
      </div>
    );
  }

  const activeIndicatorMeta = INDICATOR_LABELS[indicator];

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link className="hover:text-foreground" to="/patients">
          Patients Directory
        </Link>
        <span className="inline-flex text-xs">
          <MaterialIcon name="chevron_right" />
        </span>
        <span className="font-semibold text-foreground">
          {patient.firstName} {patient.lastName} ({patient.mrn})
        </span>
      </div>

      <PatientHeaderCard
        isBoy={isBoy}
        isEnqueuing={enqueueMutation.isPending}
        isPreterm={isPreterm}
        onEnqueue={() => {
          enqueueMutation
            .mutateAsync({
              clinicId,
              patientId,
              priority: 0,
            })
            .catch(() => null);
        }}
        patient={patient}
      />

      <Tabs defaultValue="visits">
        <TabsList>
          <TabsTrigger value="visits">
            <span className="me-1.5 inline-flex text-base">
              <MaterialIcon name="stethoscope" />
            </span>
            <span>Clinical Encounters ({patient.visits.length})</span>
          </TabsTrigger>
          <TabsTrigger value="growth">
            <span className="me-1.5 inline-flex text-base">
              <MaterialIcon name="monitoring" />
            </span>
            <span>Growth &amp; Vitals</span>
          </TabsTrigger>
          <TabsTrigger value="immunizations">
            <span className="me-1.5 inline-flex text-base">
              <MaterialIcon name="vaccines" />
            </span>
            <span>Immunizations</span>
          </TabsTrigger>
          <TabsTrigger value="guardians">
            <span className="me-1.5 inline-flex text-base">
              <MaterialIcon name="escalator_warning" />
            </span>
            <span>Guardians &amp; Contacts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits">
          <PatientVisitsTab visits={patient.visits} />
        </TabsContent>

        <TabsContent value="growth">
          <PatientGrowthTab
            activeIndicatorMeta={activeIndicatorMeta}
            indicator={indicator}
            isMeasureOpen={isMeasureOpen}
            isSubmittingMeasurement={recordMeasurementMutation.isPending}
            latestPanel={latestPanel}
            mappedChildMeasurements={mappedChildMeasurements}
            mappedCurvePoints={mappedCurvePoints}
            measureValue={measureValue}
            measurements={measurements}
            onIndicatorChange={setIndicator}
            onMeasureOpenChange={setIsMeasureOpen}
            onMeasureValueChange={setMeasureValue}
            onSubmitMeasurement={handleRecordMeasureSubmit}
            patientSex={patientSex}
          />
        </TabsContent>

        <TabsContent value="immunizations">
          <PatientImmunizationsTab
            doseNum={doseNum}
            immunizations={immunizations}
            isImmuneOpen={isImmuneOpen}
            isSubmittingImmune={recordImmuneMutation.isPending}
            lotNumber={lotNumber}
            onDoseNumChange={setDoseNum}
            onImmuneOpenChange={setIsImmuneOpen}
            onLotNumberChange={setLotNumber}
            onSubmitImmune={handleRecordImmuneSubmit}
            onVaccineCodeChange={setVaccineCode}
            vaccineCode={vaccineCode}
          />
        </TabsContent>

        <TabsContent value="guardians">
          <PatientGuardiansTab
            guardianName={guardianName}
            guardianPhone={guardianPhone}
            guardianRelation={guardianRelation}
            isGuardianOpen={isGuardianOpen}
            isSubmittingGuardian={linkGuardianMutation.isPending}
            onGuardianNameChange={setGuardianName}
            onGuardianOpenChange={setIsGuardianOpen}
            onGuardianPhoneChange={setGuardianPhone}
            onGuardianRelationChange={setGuardianRelation}
            onSubmitGuardian={handleLinkGuardianSubmit}
            patient={patient}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const Route = createFileRoute('/_app/patients/$patientId')({
  staticData: routeShell.app,
  validateSearch: patientChartSearchSchema,
  component: PatientChartComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
      throw redirect({ to: '/login' });
    }

    return { doctorId: session.data.user.id, session };
  },
});
