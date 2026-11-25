// apps/web/src/routes/_app/patients.index.tsx

import type { ColumnDef, SortingState } from '@tanstack/react-table';

import { useForm } from '@tanstack/react-form';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
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
import { useActiveClinicId } from '@/hooks/use-active-clinic';
import { useCreatePatient, usePatientList } from '@/hooks/use-patients';
import { useEnqueuePatient } from '@/hooks/use-queue';
import { authClient } from '@/lib/auth-client';
import { calculateAgeString } from '@/lib/dates';
import {
  isoDateSchema,
  optionalNumberInRange,
  optionalText,
  patientSexSchema,
  requiredText,
} from '@/lib/helpers';
import { patientsSearchSchema } from '@/lib/web/route-search-schemas';
import { routeShell } from '@/lib/web/route-shell';

type PatientRow = ReturnType<typeof usePatientList>['patients'][number];

const patientTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
  },
});

const registerPatientSchema = z.object({
  mrn: requiredText(50, 2),
  firstName: requiredText(100),
  lastName: requiredText(100),
  dateOfBirth: isoDateSchema,
  sex: patientSexSchema,
  gestationalAgeWeeks: optionalNumberInRange(20, 45, 'Gestational age'),
  birthWeightKg: optionalNumberInRange(0.3, 10, 'Birth weight'),
  birthLengthCm: optionalNumberInRange(20, 70, 'Birth length'),
  birthHeadCircumferenceCm: optionalNumberInRange(
    15,
    50,
    'Birth head circumference',
  ),
  parentName: optionalText(120),
  parentPhone: optionalText(20),
  weightKg: optionalNumberInRange(0.3, 150, 'Current weight'),
  allergies: optionalText(1000),
  notes: optionalText(2000),
});

const isPatientSex = (value: string): value is 'male' | 'female' =>
  value === 'male' || value === 'female';

const isSexFilter = (value: string): value is 'all' | 'male' | 'female' =>
  value === 'all' || value === 'male' || value === 'female';

const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== '';

const PatientNameCell = ({ row }: { row: PatientRow }) => {
  const linkParams = useMemo(() => ({ patientId: row.id }), [row.id]);

  return (
    <div>
      <Link
        className="font-semibold text-foreground hover:underline"
        params={linkParams}
        to="/patients/$patientId"
      >
        {row.firstName} {row.lastName}
      </Link>
      {hasText(row.parentName) && (
        <p className="text-xs text-muted-foreground">G: {row.parentName}</p>
      )}
    </div>
  );
};

const PatientActionsCell = ({
  patientId,
  onEnqueue,
}: {
  patientId: string;
  onEnqueue: (id: string) => void;
}) => {
  const linkParams = useMemo(() => ({ patientId }), [patientId]);

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        onClick={() => onEnqueue(patientId)}
        size="sm"
        title="Add to waiting room queue"
        type="button"
        variant="outline"
      >
        <span className="inline-flex text-sm">
          <MaterialIcon name="queue" />
        </span>
        <span className="sr-only text-xs sm:not-sr-only sm:ml-1">Queue</span>
      </Button>
      <Link params={linkParams} to="/patients/$patientId">
        <Button size="sm" type="button">
          Chart
        </Button>
      </Link>
    </div>
  );
};

const createPatientColumns = (
  onEnqueue: (patientId: string) => void,
): Array<ColumnDef<typeof patientTableFeatures, PatientRow>> => [
  {
    accessorKey: 'mrn',
    header: 'MRN',
    sortFn: 'alphanumeric',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-bold text-foreground">
        {row.original.mrn}
      </span>
    ),
  },
  {
    id: 'fullName',
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: 'Child Name',
    sortFn: 'alphanumeric',
    cell: ({ row }) => <PatientNameCell row={row.original} />,
  },
  {
    id: 'age',
    accessorFn: (row) => new Date(row.dateOfBirth).getTime(),
    header: 'Age',
    sortFn: 'basic',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {calculateAgeString(row.original.dateOfBirth)}
      </span>
    ),
  },
  {
    accessorKey: 'sex',
    header: 'Sex',
    sortFn: 'alphanumeric',
    cell: ({ row }) => (
      <Badge variant={row.original.sex === 'male' ? 'info' : 'warning'}>
        {row.original.sex}
      </Badge>
    ),
  },
  {
    id: 'neonatal',
    accessorFn: (row) => row.gestationalAgeWeeks ?? 0,
    header: 'Neonatal (GA / BW)',
    sortFn: 'basic',
    cell: ({ row }) => {
      const p = row.original;

      const gaLabel =
        p.gestationalAgeWeeks === null || p.gestationalAgeWeeks === 0
          ? '-'
          : `${p.gestationalAgeWeeks}w`;

      const bwLabel = p.birthWeightKg === null ? '-' : `${p.birthWeightKg}kg`;

      return (
        <span className="text-xs text-muted-foreground">
          {gaLabel} / {bwLabel}
        </span>
      );
    },
  },
  {
    id: 'currentWeight',
    accessorFn: (row) => row.weightKg ?? -1,
    header: 'Current Wt',
    sortFn: 'basic',
    cell: ({ row }) => {
      const wt = row.original.weightKg;

      return (
        <span className="text-xs font-semibold text-foreground">
          {wt === null ? '-' : `${wt} kg`}
        </span>
      );
    },
  },
  {
    accessorKey: 'allergies',
    header: 'Allergies',
    sortFn: 'alphanumeric',
    cell: ({ row }) =>
      hasText(row.original.allergies) ? (
        <Badge variant="warning">{row.original.allergies}</Badge>
      ) : (
        <span className="text-xs text-muted-foreground/70">None</span>
      ),
  },
  {
    id: 'actions',
    header: () => <div className="text-end">Actions</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <PatientActionsCell onEnqueue={onEnqueue} patientId={row.original.id} />
    ),
  },
];

const getSortIconName = (sortDir: string | false): string => {
  if (sortDir === 'asc') {
    return 'arrow_upward';
  }

  if (sortDir === 'desc') {
    return 'arrow_downward';
  }

  return 'unfold_more';
};

const PatientsComponent = () => {
  const clinicId = useActiveClinicId();
  const [searchQuery, setSearchQuery] = useState('');
  const [sexFilter, setSexFilter] = useState<'all' | 'male' | 'female'>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const { patients, total, isLoading } = usePatientList({
    clinicId,
    search: searchQuery,
  });

  const { create: createPatient, isPending: isCreating } = useCreatePatient();
  const enqueueMutation = useEnqueuePatient();

  const form = useForm({
    defaultValues: {
      mrn: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      // SAFETY: Default sex value narrows string to the allowed union.
      sex: 'male' as 'male' | 'female',
      gestationalAgeWeeks: '',
      birthWeightKg: '',
      birthLengthCm: '',
      birthHeadCircumferenceCm: '',
      parentName: '',
      parentPhone: '',
      weightKg: '',
      allergies: '',
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const parsed = registerPatientSchema.safeParse(value);

      if (!parsed.success) {
        return;
      }

      const v = parsed.data;

      await createPatient({
        clinicId,
        mrn: v.mrn,
        firstName: v.firstName,
        lastName: v.lastName,
        sex: v.sex,
        dateOfBirth: v.dateOfBirth,
        phone: v.parentPhone,
        parentName: v.parentName,
        parentPhone: v.parentPhone,
        allergies: v.allergies,
        weightKg: v.weightKg,
        gestationalAgeWeeks: v.gestationalAgeWeeks,
        birthWeightKg: v.birthWeightKg,
        birthLengthCm: v.birthLengthCm,
        birthHeadCircumferenceCm: v.birthHeadCircumferenceCm,
        notes: v.notes,
      });

      form.reset();
      setIsRegisterOpen(false);
    },
  });

  const handleQuickEnqueue = useCallback(
    (patientId: string) => {
      enqueueMutation
        .mutateAsync({
          clinicId,
          patientId,
          priority: 0,
        })
        .catch(() => null);
    },
    [clinicId, enqueueMutation],
  );

  const filteredRows = useMemo(() => {
    if (sexFilter === 'all') {
      return patients;
    }

    return patients.filter((p) => p.sex === sexFilter);
  }, [patients, sexFilter]);

  const columns = useMemo(
    () => createPatientColumns(handleQuickEnqueue),
    [handleQuickEnqueue],
  );

  const table = useTable({
    features: patientTableFeatures,
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
  });

  const { rows } = table.getRowModel();

  const renderHeaderCell = (
    header: ReturnType<typeof table.getHeaderGroups>[number]['headers'][number],
  ) => {
    if (header.isPlaceholder) {
      return null;
    }

    if (header.column.getCanSort()) {
      return (
        <button
          className="inline-flex cursor-pointer items-center gap-1 font-semibold hover:text-foreground"
          onClick={header.column.getToggleSortingHandler()}
          type="button"
        >
          <table.FlexRender header={header} />
          <span className="inline-flex text-xs">
            <MaterialIcon name={getSortIconName(header.column.getIsSorted())} />
          </span>
        </button>
      );
    }

    return <table.FlexRender header={header} />;
  };

  const renderDirectoryContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 p-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MaterialIcon name="person_search" />
            </EmptyMedia>
            <EmptyTitle level={2}>No patients found</EmptyTitle>
            <EmptyDescription>
              Try adjusting your search query or register a new patient chart.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    return (
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {renderHeaderCell(header)}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex text-2xl text-primary">
              <MaterialIcon name="groups" />
            </span>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Pediatric Patient Directory
            </h1>
            <Badge variant="success">{total} patients</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Search medical record numbers, pediatric demographics, and chart
            histories — Hurghada Clinic
          </p>
        </div>

        <Dialog onOpenChange={setIsRegisterOpen} open={isRegisterOpen}>
          <DialogTrigger>
            <Button type="button">
              <span className="me-1.5 inline-flex">
                <MaterialIcon name="person_add" />
              </span>
              <span>Register New Patient</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                <span className="text-lg font-bold text-foreground">
                  Register Pediatric Patient (تسجيل طفل جديد)
                </span>
              </DialogTitle>
              <DialogDescription>
                Record initial demographic and neonatal baseline measurements.
              </DialogDescription>
            </DialogHeader>

            <form
              className="space-y-4 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit().catch(() => null);
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <form.Field name="mrn">
                  {(field) => (
                    <div>
                      <Label htmlFor="mrn">MRN (رقم الملف) *</Label>
                      <Input
                        id="mrn"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. MRN-2026-001"
                        required
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="firstName">
                  {(field) => (
                    <div>
                      <Label htmlFor="firstName">
                        First Name (الاسم الأول) *
                      </Label>
                      <Input
                        id="firstName"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. Omar"
                        required
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="lastName">
                  {(field) => (
                    <div>
                      <Label htmlFor="lastName">
                        Last Name (اسم العائلة) *
                      </Label>
                      <Input
                        id="lastName"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. Hassan"
                        required
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <form.Field name="dateOfBirth">
                  {(field) => (
                    <div>
                      <Label htmlFor="dob">
                        Date of Birth (تاريخ الميلاد) *
                      </Label>
                      <Input
                        id="dob"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        required
                        type="date"
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="sex">
                  {(field) => (
                    <div>
                      <Label htmlFor="sex">Sex (الجنس) *</Label>
                      <Select
                        onValueChange={(v) => {
                          if (isPatientSex(v)) {
                            field.handleChange(v);
                          }
                        }}
                        value={field.state.value}
                      >
                        <SelectTrigger id="sex">
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male (ذكر)</SelectItem>
                          <SelectItem value="female">Female (أنثى)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </form.Field>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-bold tracking-wider text-foreground uppercase">
                  Neonatal Baseline (بيانات الولادة)
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <form.Field name="gestationalAgeWeeks">
                    {(field) => (
                      <div>
                        <Label htmlFor="ga">
                          <span className="text-xs">GA (Weeks)</span>
                        </Label>
                        <Input
                          id="ga"
                          max="44"
                          min="20"
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="38"
                          step="0.1"
                          type="number"
                          value={field.state.value}
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="birthWeightKg">
                    {(field) => (
                      <div>
                        <Label htmlFor="bw">
                          <span className="text-xs">Birth Wt (kg)</span>
                        </Label>
                        <Input
                          id="bw"
                          max="10"
                          min="0.3"
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="3.2"
                          step="0.01"
                          type="number"
                          value={field.state.value}
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="birthLengthCm">
                    {(field) => (
                      <div>
                        <Label htmlFor="bl">
                          <span className="text-xs">Length (cm)</span>
                        </Label>
                        <Input
                          id="bl"
                          max="70"
                          min="20"
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="50"
                          step="0.1"
                          type="number"
                          value={field.state.value}
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="birthHeadCircumferenceCm">
                    {(field) => (
                      <div>
                        <Label htmlFor="bhc">
                          <span className="text-xs">Head Circ (cm)</span>
                        </Label>
                        <Input
                          id="bhc"
                          max="50"
                          min="15"
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="34.5"
                          step="0.1"
                          type="number"
                          value={field.state.value}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <form.Field name="parentName">
                  {(field) => (
                    <div>
                      <Label htmlFor="parentName">
                        Guardian Name (ولي الأمر)
                      </Label>
                      <Input
                        id="parentName"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Mother or Father name"
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="parentPhone">
                  {(field) => (
                    <div>
                      <Label htmlFor="parentPhone">
                        Guardian Phone (رقم التواصل)
                      </Label>
                      <Input
                        id="parentPhone"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="010xxxxxxxx"
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <form.Field name="weightKg">
                  {(field) => (
                    <div>
                      <Label htmlFor="currentWeight">
                        Current Weight (الوزن الحالي كجم)
                      </Label>
                      <Input
                        id="currentWeight"
                        max="150"
                        min="0.3"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. 5.4"
                        step="0.01"
                        type="number"
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="allergies">
                  {(field) => (
                    <div>
                      <Label htmlFor="allergies">
                        Allergies (الحساسية الدوائية والغذائية)
                      </Label>
                      <Input
                        id="allergies"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. Penicillin, Egg allergy, NKDA"
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="notes">
                {(field) => (
                  <div>
                    <Label htmlFor="notes">Clinical Notes / History</Label>
                    <Textarea
                      id="notes"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Feeding history, birth/lactation notes, or chronic conditions..."
                      rows={2}
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>

              <DialogFooter>
                <Button
                  disabled={isCreating}
                  onClick={() => setIsRegisterOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      disabled={!canSubmit || isSubmitting || isCreating}
                      type="submit"
                    >
                      {isCreating || isSubmitting
                        ? 'Saving...'
                        : 'Save Patient'}
                    </Button>
                  )}
                </form.Subscribe>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Sex Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <span className="inline-flex text-muted-foreground">
            <MaterialIcon name="search" />
          </span>
          <Input
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by child name, MRN, parent phone..."
            value={searchQuery}
          />
        </div>
        <Select
          onValueChange={(v) => {
            if (isSexFilter(v)) {
              setSexFilter(v);
            }
          }}
          value={sexFilter}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sexes</SelectItem>
            <SelectItem value="male">Male (ذكر)</SelectItem>
            <SelectItem value="female">Female (أنثى)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Patients List Table (TanStack Table v9) */}
      <div className="rounded-xl border border-border bg-card">
        <Card>
          <CardContent>{renderDirectoryContent()}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_app/patients/')({
  staticData: routeShell.app,
  validateSearch: patientsSearchSchema,
  component: PatientsComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
      throw redirect({ to: '/login' });
    }

    return { session };
  },
});
