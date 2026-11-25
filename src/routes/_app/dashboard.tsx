// apps/web/src/routes/_app/dashboard.tsx

import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

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
import { useActiveClinic } from '@/hooks/use-active-clinic';
import { useTodayAppointments } from '@/hooks/use-appointments';
import { useQueueCounts } from '@/hooks/use-clinic-store';
import { useLedgerSummary } from '@/hooks/use-finance';
import { usePatientList } from '@/hooks/use-patients';
import {
  useCallNext,
  useSyncQueueToStore,
  useUpdateQueueStatus,
} from '@/hooks/use-queue';
import { authClient } from '@/lib/auth-client';
import { routeShell } from '@/lib/web/route-shell';

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(cents / 100);

const EMPTY_QUEUE: Array<never> = [];
const EMPTY_APPOINTMENTS: Array<never> = [];

const formatTodayDate = () =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

const DashboardComponent = () => {
  const { user, clinicId } = useActiveClinic();

  const [activeQueueActionId, setActiveQueueActionId] = useState<string | null>(
    null,
  );

  // Clinical Queries & Store Sync
  const { data: queueData, isLoading: isQueueLoading } =
    useSyncQueueToStore(clinicId);

  const counts = useQueueCounts();
  const activeQueueCount = counts.waiting + counts.inVitals;
  const activeWaitingCount = counts.waiting + counts.inVitals;

  const { data: todayAppointments, isLoading: isAppointmentsLoading } =
    useTodayAppointments(clinicId);

  const { total: totalPatients, isLoading: isPatientsLoading } = usePatientList(
    { clinicId },
  );

  const { data: ledgerSummary, isLoading: isFinanceLoading } =
    useLedgerSummary(clinicId);

  // Mutations
  const callNextMutation = useCallNext();
  const updateStatusMutation = useUpdateQueueStatus();

  const [todayDateString, setTodayDateString] = useState(formatTodayDate);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setTodayDateString(formatTodayDate()),
      60_000,
    );

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleCallNext = async () => {
    await callNextMutation.mutateAsync({ clinicId });
  };

  const handleQueueStatusUpdate = async (
    id: string,
    status: 'IN_VITALS' | 'WITH_DOCTOR',
  ) => {
    setActiveQueueActionId(id);

    try {
      await updateStatusMutation.mutateAsync({ id, status });
    } catch (error) {
      // Surface through mutation state; rethrow so React Query keeps the error.
      setActiveQueueActionId(null);
      throw error;
    }

    setActiveQueueActionId(null);
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8">
      {/* Header Greeting Banner */}
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-xl border border-border bg-background p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <MaterialIcon name="local_hospital" />
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Pediatric &amp; Lactation Clinic — Hurghada
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {todayDateString} &bull; Dr. Hazem Ali, MD, IBCLC &bull; Welcome,{' '}
            <span className="font-semibold text-foreground">
              {user?.name ?? 'Dr. Hazem Ali'}
            </span>{' '}
            ({user?.role?.toUpperCase() ?? 'CLINICIAN'})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button render={<Link to="/queue" />}>
            <MaterialIcon name="person_check" />
            <span>Live Waiting Room</span>
          </Button>
          <Button render={<Link to="/patients" />} variant="outline">
            <MaterialIcon name="person_add" />
            <span>Register Patient</span>
          </Button>
        </div>
      </div>

      {/* 4 Clinical KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active Queue (الانتظار)"
          icon="groups"
          isLoading={isQueueLoading}
          value={activeQueueCount}
          hint={`waiting • ${counts.withDoctor} with doctor`}
        />
        <KpiCard
          label="Today's Visits (المواعيد)"
          icon="calendar_month"
          isLoading={isAppointmentsLoading}
          value={todayAppointments?.length ?? 0}
          hint="scheduled visits"
        />
        <KpiCard
          label="Directory (سجل الأطفال)"
          icon="child_care"
          isLoading={isPatientsLoading}
          value={totalPatients}
          hint="pediatric charts"
        />
        <KpiCard
          label="Daily Revenue (الإيراد)"
          icon="payments"
          isLoading={isFinanceLoading}
          value={formatCurrency(ledgerSummary?.totalRevenueCents ?? 0)}
          hint={`net: ${formatCurrency(ledgerSummary?.netBalanceCents ?? 0)}`}
        />
      </div>

      {/* Main Grid: Waiting Room + Schedule & Clinical Tools */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <WaitingRoomCard
            activeQueueActionId={activeQueueActionId}
            activeWaitingCount={activeWaitingCount}
            callNextMutation={callNextMutation}
            entries={queueData ?? EMPTY_QUEUE}
            isLoading={isQueueLoading}
            onCallNext={handleCallNext}
            onQueueStatusUpdate={handleQueueStatusUpdate}
          />
          <TodayScheduleCard
            appointments={todayAppointments ?? EMPTY_APPOINTMENTS}
            isLoading={isAppointmentsLoading}
          />
        </div>

        <div className="space-y-6">
          <ClinicalToolsCard />
          <SafetyNote />
        </div>
      </div>
    </div>
  );
};

interface KpiCardProps {
  label: string;
  icon: string;
  isLoading: boolean;
  value: number | string;
  hint: string;
}

const KpiCard = ({ label, icon, isLoading, value, hint }: KpiCardProps) => (
  <Card>
    <CardHeader>
      <div className="flex flex-row items-center justify-between">
        <CardTitle>{label}</CardTitle>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <MaterialIcon name={icon} />
        </span>
      </div>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-3xl font-extrabold text-foreground">
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

interface QueueEntry {
  id: string;
  patientId: string;
  status: string;
  priority: number;
  patient?: { firstName?: string; lastName?: string; mrn?: string };
}

interface WaitingRoomCardProps {
  entries: Array<QueueEntry>;
  isLoading: boolean;
  activeWaitingCount: number;
  activeQueueActionId: string | null;
  callNextMutation: { isPending: boolean };
  onCallNext: () => Promise<void>;
  onQueueStatusUpdate: (
    id: string,
    status: 'IN_VITALS' | 'WITH_DOCTOR',
  ) => Promise<void>;
}

const WaitingRoomCard = ({
  entries,
  isLoading,
  activeWaitingCount,
  activeQueueActionId,
  callNextMutation,
  onCallNext,
  onQueueStatusUpdate,
}: WaitingRoomCardProps) => {
  let content;

  if (isLoading) {
    content = (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  } else if (entries.length === 0) {
    content = <EmptyQueue />;
  } else {
    content = (
      <div className="divide-y divide-border">
        {entries.map((entry, idx) => (
          <QueueRow
            entry={entry}
            idx={idx}
            isRowUpdating={activeQueueActionId === entry.id}
            key={entry.id}
            onQueueStatusUpdate={onQueueStatusUpdate}
          />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              <span className="flex items-center gap-2">
                <MaterialIcon name="hourglass_top" />
                <span>Waiting Room &amp; Triage (صالة الانتظار)</span>
              </span>
            </CardTitle>
            <CardDescription>
              Live queue order for vitals assessment and physician consultation
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={activeWaitingCount === 0 || callNextMutation.isPending}
              onClick={onCallNext}
              size="sm"
              type="button"
            >
              <MaterialIcon name="notifications_active" />
              <span>Call Next</span>
            </Button>
            <Button render={<Link to="/queue" />} size="sm" variant="outline">
              Manage
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};

const EmptyQueue = () => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <MaterialIcon name="airline_seat_recline_normal" />
    <p className="mt-2 font-medium text-muted-foreground">
      Waiting room is currently empty
    </p>
    <p className="text-xs text-muted-foreground/70">
      Patients enqueued at reception or walk-in will appear here.
    </p>
    <Button
      className="mt-4"
      render={<Link to="/queue" />}
      size="sm"
      variant="outline"
    >
      Enqueue Walk-in Patient
    </Button>
  </div>
);

interface QueueRowProps {
  entry: QueueEntry;
  idx: number;
  isRowUpdating: boolean;
  onQueueStatusUpdate: (
    id: string,
    status: 'IN_VITALS' | 'WITH_DOCTOR',
  ) => Promise<void>;
}

const QueueRow = ({
  entry,
  idx,
  isRowUpdating,
  onQueueStatusUpdate,
}: QueueRowProps) => {
  const patientParams = useMemo(
    () => ({ patientId: entry.patientId }),
    [entry.patientId],
  );

  let statusBadgeClass = 'bg-background text-foreground';

  if (entry.status === 'WAITING') {
    statusBadgeClass = 'bg-secondary text-secondary-foreground';
  } else if (entry.status === 'IN_VITALS') {
    statusBadgeClass = 'bg-muted text-muted-foreground';
  } else if (entry.status === 'WITH_DOCTOR') {
    statusBadgeClass = 'bg-accent text-accent-foreground';
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
          #{idx + 1}
        </span>
        <div>
          <Link
            className="font-semibold text-foreground hover:underline"
            params={patientParams}
            to="/patients/$patientId"
          >
            {entry.patient?.firstName} {entry.patient?.lastName}
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>MRN: {entry.patient?.mrn}</span>
            <span>&bull;</span>
            <span>
              Priority: <strong className="capitalize">{entry.priority}</strong>
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${statusBadgeClass}`}
        >
          {entry.status.replace('_', ' ')}
        </span>
        {entry.status === 'WAITING' && (
          <Button
            disabled={isRowUpdating}
            onClick={async () =>
              await onQueueStatusUpdate(entry.id, 'IN_VITALS')
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Vitals
          </Button>
        )}
        {entry.status === 'IN_VITALS' && (
          <Button
            disabled={isRowUpdating}
            onClick={async () =>
              await onQueueStatusUpdate(entry.id, 'WITH_DOCTOR')
            }
            size="sm"
            type="button"
          >
            Start Visit
          </Button>
        )}
      </div>
    </div>
  );
};

interface TodayScheduleCardProps {
  appointments: Array<{
    id: string;
    scheduledAt: string | Date;
    status: string;
    reason?: string | null;
    patient?: { firstName?: string; lastName?: string };
  }>;
  isLoading: boolean;
}

const TodayScheduleCard = ({
  appointments,
  isLoading,
}: TodayScheduleCardProps) => {
  let content;

  if (isLoading) {
    content = (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  } else if (appointments.length === 0) {
    content = (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No scheduled appointments for today yet.
      </div>
    );
  } else {
    content = (
      <div className="divide-y divide-border">
        {appointments.slice(0, 5).map((apt) => (
          <div
            className="flex items-center justify-between py-2.5"
            key={apt.id}
          >
            <div>
              <p className="font-semibold text-foreground">
                {apt.patient?.firstName} {apt.patient?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(apt.scheduledAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                &bull; {apt.reason ?? 'Routine Checkup'}
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground uppercase">
              {apt.status}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              <span className="flex items-center gap-2">
                <MaterialIcon name="calendar_today" />
                <span>Today&apos;s Booked Schedule</span>
              </span>
            </CardTitle>
            <CardDescription>
              Appointments reserved for outpatient visits today
            </CardDescription>
          </div>
          <Button
            render={<Link to="/appointments" />}
            size="sm"
            variant="outline"
          >
            View All Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};

const ClinicalToolsCard = () => (
  <Card>
    <CardHeader>
      <CardTitle>Clinical Decision Tools</CardTitle>
      <CardDescription>
        Pediatric calculators, lactation notes &amp; guidelines
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <ClinicalToolLink
          description="EDA dosing & mg/kg weight safety"
          icon="medication"
          title="Formulary & Dosing"
          to="/prescriptions"
        />
        <ClinicalToolLink
          description="Z-scores and percentiles"
          icon="monitoring"
          title="Growth Curves (WHO / Egypt LMS)"
          to="/growth"
        />
        <ClinicalToolLink
          description="Egyptian MOH routine schedule"
          icon="vaccines"
          title="Vaccination Matrix"
          to="/immunizations"
        />
        <ClinicalToolLink
          description="Clinical notes & lactation education jobs"
          icon="psychology"
          title="AI & Task Monitor"
          to="/jobs"
        />
      </div>
    </CardContent>
  </Card>
);

interface ClinicalToolLinkProps {
  description: string;
  icon: string;
  title: string;
  to: string;
}

const ClinicalToolLink = ({
  description,
  icon,
  title,
  to,
}: ClinicalToolLinkProps) => (
  <Link
    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted"
    to={to}
  >
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <MaterialIcon name={icon} />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <MaterialIcon name="chevron_right" />
  </Link>
);

const SafetyNote = () => (
  <div className="rounded-lg border border-warning bg-warning/10 p-4 text-xs text-foreground">
    <div className="mb-1 flex items-center gap-2 font-bold">
      <MaterialIcon name="warning" />
      <span>Pediatric &amp; Lactation Safety Note</span>
    </div>
    Always verify neonatal gestational age, birth weight, and current weight in
    kilograms before confirming drug calculations, lactation supplementation
    plans, or vaccine administration.
  </div>
);

export const Route = createFileRoute('/_app/dashboard')({
  staticData: routeShell.app,
  component: DashboardComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // TanStack Router requires redirect responses to be thrown.
      // eslint-disable-next-line typescript-eslint/only-throw-error
      throw redirect({ to: '/login' });
    }

    return { session };
  },
});
