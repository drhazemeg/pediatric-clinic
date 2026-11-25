// apps/web/src/routes/immunizations.tsx

import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/material-icon';
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
import { useImmunizationMatrix } from '@/hooks/use-immunizations';
import { authClient } from '@/lib/auth-client';
import { immunizationsSearchSchema } from '@/lib/web/route-search-schemas';
import { routeShell } from '@/lib/web/route-shell';

const EGYPT_ROUTINE_SCHEDULE = [
  {
    age: 'At Birth (خلال أول 24 ساعة)',
    vaccines: [
      {
        name: 'BCG',
        disease: 'Tuberculosis (الدرن)',
        route: 'Intradermal (كتف أيسر)',
      },
      {
        name: 'HepB (Zero dose)',
        disease: 'Hepatitis B (التهاب الكبد ب)',
        route: 'Intramuscular (فخذ أيمن)',
      },
    ],
  },
  {
    age: '2 Months (شهرين)',
    vaccines: [
      {
        name: 'Sabin (OPV 1)',
        disease: 'Poliomyelitis (شلل الأطفال الفموي)',
        route: 'Oral (نقطتان بالفم)',
      },
      {
        name: 'IPV 1',
        disease: 'Inactivated Polio (شلل الأطفال بالحقن)',
        route: 'Intramuscular',
      },
      {
        name: 'Pentavalent 1',
        disease:
          'DTP + HepB + Hib (الخماسي: الدفتيريا، التيتانوس، السعال الديكي، الكبد ب، الإنفلونزا البكتيرية)',
        route: 'Intramuscular',
      },
    ],
  },
  {
    age: '4 Months (4 أشهر)',
    vaccines: [
      { name: 'Sabin (OPV 2)', disease: 'Poliomyelitis', route: 'Oral' },
      { name: 'IPV 2', disease: 'Inactivated Polio', route: 'Intramuscular' },
      {
        name: 'Pentavalent 2',
        disease: 'DTP + HepB + Hib',
        route: 'Intramuscular',
      },
    ],
  },
  {
    age: '6 Months (6 أشهر)',
    vaccines: [
      { name: 'Sabin (OPV 3)', disease: 'Poliomyelitis', route: 'Oral' },
      {
        name: 'Pentavalent 3',
        disease: 'DTP + HepB + Hib',
        route: 'Intramuscular',
      },
    ],
  },
  {
    age: '9 Months (9 أشهر)',
    vaccines: [
      { name: 'Sabin (OPV 4)', disease: 'Poliomyelitis', route: 'Oral' },
      {
        name: 'Vitamin A (100,000 IU)',
        disease: 'Vitamin A supplement (كبسولة فيتامين أ الزرقاء)',
        route: 'Oral',
      },
    ],
  },
  {
    age: '12 Months (سنة)',
    vaccines: [
      {
        name: 'MMR 1',
        disease: 'Measles, Mumps, Rubella (الحصبة، النكاف، الحصبة الألمانية)',
        route: 'Subcutaneous (كتف أيمن)',
      },
      { name: 'Sabin (OPV 5)', disease: 'Poliomyelitis', route: 'Oral' },
    ],
  },
  {
    age: '18 Months (سنة ونصف)',
    vaccines: [
      {
        name: 'DTP Booster',
        disease: 'Diphtheria, Tetanus, Pertussis (الثلاثي البكتيري)',
        route: 'Intramuscular',
      },
      {
        name: 'MMR 2 (Booster)',
        disease: 'Measles, Mumps, Rubella',
        route: 'Subcutaneous',
      },
      { name: 'Sabin (Booster)', disease: 'Poliomyelitis', route: 'Oral' },
      {
        name: 'Vitamin A (200,000 IU)',
        disease: 'Vitamin A (كبسولتان حمراوان)',
        route: 'Oral',
      },
    ],
  },
];

interface MatrixRowItem {
  patientId: string;
  firstName: string;
  lastName: string;
  mrn?: string | null;
  dateOfBirth: string;
}

const ImmunizationMatrixRow = ({ row }: { row: MatrixRowItem }) => {
  const linkParams = useMemo(
    () => ({ patientId: row.patientId }),
    [row.patientId],
  );

  const mrnLabel =
    row.mrn !== null && row.mrn !== undefined && row.mrn !== '' ? row.mrn : '-';

  return (
    <TableRow>
      <TableCell>
        <span className="text-xs font-bold text-foreground">
          {row.firstName} {row.lastName}
        </span>
      </TableCell>
      <TableCell>
        <span className="font-mono text-xs text-muted-foreground">
          {mrnLabel}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">{row.dateOfBirth}</span>
      </TableCell>
      <TableCell className="text-end">
        <Link params={linkParams} to="/patients/$patientId">
          <Button size="sm" type="button" variant="outline">
            View Chart
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
};

const ImmunizationsComponent = () => {
  const clinicId = useActiveClinicId();
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const { data: matrixData, isLoading: isMatrixLoading } =
    useImmunizationMatrix(clinicId, { onlyOverdue });

  const matrixRows = matrixData?.rows ?? [];

  const renderMatrixContent = () => {
    if (isMatrixLoading) {
      return (
        <div className="space-y-3 p-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (matrixRows.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No overdue children recorded.
        </p>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Child Name</TableHead>
            <TableHead>MRN</TableHead>
            <TableHead>DOB</TableHead>
            <TableHead className="text-end">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrixRows.map((row) => (
            <ImmunizationMatrixRow key={row.patientId} row={row} />
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex text-2xl text-primary">
            <MaterialIcon name="vaccines" />
          </span>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Egyptian Routine Immunization Schedule &amp; Clinic Tracker
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Ministry of Health mandatory vaccination schedule, coverage tracking,
          and overdue recall (الجدول الوطني للتطعيمات)
        </p>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">
            <span className="me-1.5 inline-flex text-base">
              <MaterialIcon name="calendar_today" />
            </span>
            <span>National MOH Schedule (جدول التطعيمات)</span>
          </TabsTrigger>
          <TabsTrigger value="matrix">
            <span className="me-1.5 inline-flex text-base">
              <MaterialIcon name="group" />
            </span>
            <span>Clinic Coverage Matrix &amp; Overdue Recall</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: MOH Schedule */}
        <TabsContent value="schedule">
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {EGYPT_ROUTINE_SCHEDULE.map((tier) => (
              <div
                className="rounded-xl border border-border bg-card"
                key={tier.age}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between pb-1">
                      <CardTitle>
                        <span className="text-base font-bold text-foreground">
                          {tier.age}
                        </span>
                      </CardTitle>
                      <span className="rounded bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                        {tier.vaccines.length} doses
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {tier.vaccines.map((v) => (
                        <div className="py-2.5" key={v.name}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground">
                              {v.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {v.route}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Target: {v.disease}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Coverage Matrix */}
        <TabsContent value="matrix">
          <div className="mt-6 rounded-xl border border-border bg-card">
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between gap-4 pb-1">
                  <div>
                    <CardTitle>
                      <span className="text-base font-bold text-foreground">
                        Registered Patients Immunization Status
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Track compliance with mandatory vaccines and identify
                      overdue children
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setOnlyOverdue(!onlyOverdue)}
                      size="sm"
                      type="button"
                      variant={onlyOverdue ? 'destructive' : 'outline'}
                    >
                      <span className="me-1 inline-flex text-xs">
                        <MaterialIcon name="warning" />
                      </span>
                      <span>Only Overdue ({onlyOverdue ? 'ON' : 'OFF'})</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>{renderMatrixContent()}</CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const Route = createFileRoute('/_app/immunizations')({
  staticData: routeShell.app,
  validateSearch: immunizationsSearchSchema,
  component: ImmunizationsComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
      throw redirect({ to: '/login' });
    }

    return { session };
  },
});
