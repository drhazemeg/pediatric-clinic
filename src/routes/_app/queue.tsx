// apps/web/src/routes/queue.tsx

import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

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
import { useActiveClinic } from '@/hooks/use-active-clinic';
import { usePatientList } from '@/hooks/use-patients';
import {
  useCallNext,
  useEnqueuePatient,
  useQueueToday,
  useUpdateQueueStatus,
} from '@/hooks/use-queue';
import { authClient } from '@/lib/auth-client';
import { routeShell } from '@/lib/web/route-shell';

type FilterStatus =
  | 'all'
  | 'WAITING'
  | 'IN_VITALS'
  | 'WITH_DOCTOR'
  | 'COMPLETED';

type TriagePriority = 'normal' | 'priority' | 'urgent';

const PRIORITY_VALUE_MAP: Record<TriagePriority, number> = {
  normal: 0,
  priority: 1,
  urgent: 2,
};

const isTriagePriority = (value: string): value is TriagePriority =>
  value === 'normal' || value === 'priority' || value === 'urgent';

const getPriorityBadgeClass = (priority: number): string => {
  if (priority >= 2) {
    return 'border-destructive/30 bg-destructive/10 text-destructive';
  }

  if (priority === 1) {
    return 'border-chart-6/30 bg-chart-6/10 text-chart-6';
  }

  return 'border-border bg-muted text-muted-foreground';
};

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'WAITING': {
      return 'bg-warning/15 text-warning';
    }

    case 'IN_VITALS': {
      return 'bg-chart-6/15 text-chart-6';
    }

    case 'WITH_DOCTOR': {
      return 'bg-chart-2/15 text-chart-2';
    }

    default: {
      return 'bg-muted text-muted-foreground';
    }
  }
};

interface QueueEntryCardProps {
  entry: NonNullable<ReturnType<typeof useQueueToday>['data']>[number];
  index: number;
  onUpdateStatus: (
    id: string,
    status: 'IN_VITALS' | 'WITH_DOCTOR' | 'COMPLETED',
  ) => void;
}

const QueueEntryCard = ({
  entry,
  index,
  onUpdateStatus,
}: QueueEntryCardProps) => {
  const linkParams = useMemo(
    () => ({ patientId: entry.patientId }),
    [entry.patientId],
  );

  const priorityClass = getPriorityBadgeClass(entry.priority);
  const statusClass = getStatusBadgeClass(entry.status);

  const phoneDisplay =
    entry.patient.parentPhone !== null && entry.patient.parentPhone !== ''
      ? entry.patient.parentPhone
      : 'None';

  return (
    <div className="rounded-xl border border-border bg-card transition-shadow hover:shadow-sm">
      <Card>
        <CardContent>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent font-heading text-lg font-extrabold text-accent-foreground">
                #{index + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    className="text-base font-bold text-foreground hover:underline"
                    params={linkParams}
                    to="/patients/$patientId"
                  >
                    {entry.patient.firstName} {entry.patient.lastName}
                  </Link>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                    {entry.patient.mrn}
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-bold uppercase ${priorityClass}`}
                  >
                    {entry.priority}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Arrived:{' '}
                  {new Date(entry.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  &bull; Phone: {phoneDisplay}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClass}`}
              >
                {entry.status.replace('_', ' ')}
              </span>

              {entry.status === 'WAITING' && (
                <Button
                  onClick={() => onUpdateStatus(entry.id, 'IN_VITALS')}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Send to Vitals
                </Button>
              )}

              {(entry.status === 'WAITING' || entry.status === 'IN_VITALS') && (
                <Button
                  onClick={() => onUpdateStatus(entry.id, 'WITH_DOCTOR')}
                  size="sm"
                  type="button"
                >
                  Call into Room
                </Button>
              )}

              {entry.status === 'WITH_DOCTOR' && (
                <Button
                  onClick={() => onUpdateStatus(entry.id, 'COMPLETED')}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Mark Completed
                </Button>
              )}

              <Link params={linkParams} to="/patients/$patientId">
                <Button size="sm" type="button" variant="ghost">
                  View Chart
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const QueueComponent = () => {
  const { user, clinicId } = useActiveClinic();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [isEnqueueOpen, setIsEnqueueOpen] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [priority, setPriority] = useState<TriagePriority>('normal');

  const { data: queueData, isLoading: isQueueLoading } =
    useQueueToday(clinicId);

  const { patients } = usePatientList({ clinicId });

  const enqueueMutation = useEnqueuePatient();
  const updateStatusMutation = useUpdateQueueStatus();
  const callNextMutation = useCallNext();

  const filteredQueue = useMemo(() => {
    const all = queueData ?? [];

    if (activeFilter === 'all') {
      return all;
    }

    return all.filter((item) => item.status === activeFilter);
  }, [queueData, activeFilter]);

  const waitingCount = useMemo(
    () => (queueData ?? []).filter((i) => i.status === 'WAITING').length,
    [queueData],
  );

  const vitalsCount = useMemo(
    () => (queueData ?? []).filter((i) => i.status === 'IN_VITALS').length,
    [queueData],
  );

  const doctorCount = useMemo(
    () => (queueData ?? []).filter((i) => i.status === 'WITH_DOCTOR').length,
    [queueData],
  );

  const handleCallNext = async () => {
    if (user?.id === undefined || user.id === '') {
      return;
    }

    await callNextMutation.mutateAsync({ clinicId });
  };

  const handleEnqueueSubmit = async (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedPatientId === '') {
      return;
    }

    await enqueueMutation.mutateAsync({
      clinicId,
      patientId: selectedPatientId,
      priority: PRIORITY_VALUE_MAP[priority],
    });

    setSelectedPatientId('');
    setPriority('normal');
    setIsEnqueueOpen(false);
  };

  const renderQueueBody = () => {
    if (isQueueLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    if (filteredQueue.length === 0) {
      return (
        <div className="rounded-xl border border-border bg-card">
          <Card>
            <CardContent>
              <div className="py-12 text-center">
                <span className="inline-flex text-4xl text-muted-foreground/50">
                  <MaterialIcon name="chair" />
                </span>
                <p className="mt-2 font-medium text-muted-foreground">
                  No patients in this queue stage
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredQueue.map((entry, idx) => (
          <QueueEntryCard
            entry={entry}
            index={idx}
            key={entry.id}
            onUpdateStatus={(id, status) => {
              updateStatusMutation
                .mutateAsync({ id, status })
                .catch(() => null);
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex text-2xl text-primary">
              <MaterialIcon name="hourglass_top" />
            </span>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Outpatient Waiting Room &amp; Triage
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time patient flow: Reception &rarr; Vitals Assessment &rarr;
            Physician Consultation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            disabled={waitingCount === 0 || callNextMutation.isPending}
            onClick={() => {
              handleCallNext().catch(() => null);
            }}
            type="button"
          >
            <span className="me-1.5 inline-flex">
              <MaterialIcon name="notifications_active" />
            </span>
            <span>Call Next Patient</span>
          </Button>

          <Dialog onOpenChange={setIsEnqueueOpen} open={isEnqueueOpen}>
            <DialogTrigger>
              <Button type="button" variant="outline">
                <span className="me-1.5 inline-flex">
                  <MaterialIcon name="add_circle" />
                </span>
                <span>Triage Walk-In</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Triage &amp; Enqueue Walk-In</DialogTitle>
                <DialogDescription>
                  Place an arrival in the clinic waiting room queue.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4 py-2"
                onSubmit={(e) => {
                  handleEnqueueSubmit(e).catch(() => null);
                }}
              >
                <div>
                  <Label htmlFor="patientSelect">Select Patient *</Label>
                  <Select
                    onValueChange={(v) => {
                      if (v !== '') {
                        setSelectedPatientId(v);
                      }
                    }}
                    value={selectedPatientId}
                  >
                    <SelectTrigger id="patientSelect">
                      <SelectValue placeholder="Choose registered patient..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Don&apos;t see the patient?{' '}
                    <Link className="text-primary underline" to="/patients">
                      Register them first
                    </Link>
                  </p>
                </div>

                <div>
                  <Label htmlFor="prioritySelect">Triage Priority</Label>
                  <Select
                    onValueChange={(v) => {
                      if (isTriagePriority(v)) {
                        setPriority(v);
                      }
                    }}
                    value={priority}
                  >
                    <SelectTrigger id="prioritySelect">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">
                        Normal (عادي) &bull; Routine checkup / follow-up
                      </SelectItem>
                      <SelectItem value="priority">
                        Priority (أولوية) &bull; High fever, neonates &lt; 28d
                      </SelectItem>
                      <SelectItem value="urgent">
                        Urgent (طارئ) &bull; Respiratory distress, dehydration
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button
                    onClick={() => setIsEnqueueOpen(false)}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      selectedPatientId === '' || enqueueMutation.isPending
                    }
                    type="submit"
                  >
                    Add to Queue
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:bg-muted'
          }`}
          onClick={() => setActiveFilter('all')}
          type="button"
        >
          All ({queueData?.length ?? 0})
        </button>
        <button
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeFilter === 'WAITING'
              ? 'bg-warning text-warning-foreground'
              : 'bg-card text-muted-foreground hover:bg-muted'
          }`}
          onClick={() => setActiveFilter('WAITING')}
          type="button"
        >
          Waiting ({waitingCount})
        </button>
        <button
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeFilter === 'IN_VITALS'
              ? 'bg-chart-6 text-primary-foreground'
              : 'bg-card text-muted-foreground hover:bg-muted'
          }`}
          onClick={() => setActiveFilter('IN_VITALS')}
          type="button"
        >
          In Vitals ({vitalsCount})
        </button>
        <button
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeFilter === 'WITH_DOCTOR'
              ? 'bg-chart-2 text-primary-foreground'
              : 'bg-card text-muted-foreground hover:bg-muted'
          }`}
          onClick={() => setActiveFilter('WITH_DOCTOR')}
          type="button"
        >
          With Doctor ({doctorCount})
        </button>
        <button
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeFilter === 'COMPLETED'
              ? 'bg-foreground text-background'
              : 'bg-card text-muted-foreground hover:bg-muted'
          }`}
          onClick={() => setActiveFilter('COMPLETED')}
          type="button"
        >
          Completed
        </button>
      </div>

      {renderQueueBody()}
    </div>
  );
};

export const Route = createFileRoute('/_app/queue')({
  staticData: routeShell.app,
  component: QueueComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
      throw redirect({ to: '/login' });
    }

    return { session };
  },
});
