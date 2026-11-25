// apps/web/src/routes/_app/appointments.tsx

import type { ChangeEvent } from 'react';

import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { useMemo, useState } from 'react';

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
import { useActiveClinicId } from '@/hooks/use-active-clinic';
import {
  useCreateAppointment,
  useTodayAppointments,
  useUpdateAppointmentStatus,
} from '@/hooks/use-appointments';
import { usePatientList } from '@/hooks/use-patients';
import { useEnqueuePatient } from '@/hooks/use-queue';
import { authClient } from '@/lib/auth-client';
import { appointmentsSearchSchema } from '@/lib/web/route-search-schemas';
import { routeShell } from '@/lib/web/route-shell';

const VISIT_REASONS = [
  'Routine Neonatal Checkup (متابعة حديثي الولادة)',
  'Lactation & Breastfeeding Consultation (استشارة رضاعة طبيعية)',
  'Routine Vaccination (تطعيم دوري)',
  'Acute Illness / Fever (حمى أو مرض حاد)',
  'Growth & Nutrition Assessment (متابعة نمو وتغذية)',
  'Post-Discharge Follow-up (متابعة بعد خروج)',
] as const;

const getAppointmentBadgeClass = (status: string): string => {
  switch (status) {
    case 'scheduled': {
      return 'bg-chart-6/15 text-chart-6';
    }

    case 'checked_in': {
      return 'bg-warning/15 text-warning';
    }

    case 'completed': {
      return 'bg-chart-2/15 text-chart-2';
    }

    case 'cancelled': {
      return 'bg-destructive/15 text-destructive';
    }

    default: {
      return 'bg-muted text-muted-foreground';
    }
  }
};

type AppointmentStatusFilter =
  | 'all'
  | 'scheduled'
  | 'checked_in'
  | 'completed'
  | 'cancelled';

const isAppointmentStatusFilter = (
  value: string,
): value is AppointmentStatusFilter =>
  value === 'all' ||
  value === 'scheduled' ||
  value === 'checked_in' ||
  value === 'completed' ||
  value === 'cancelled';

type AppointmentItem = NonNullable<
  ReturnType<typeof useTodayAppointments>['data']
>[number];

interface AppointmentRowProps {
  apt: AppointmentItem;
  enqueuingPatientId: string | null;
  isUpdatingStatus: boolean;
  onSendToQueue: (appointmentId: string, patientId: string) => void;
  onCancel: (appointmentId: string) => void;
}

const AppointmentRow = ({
  apt,
  enqueuingPatientId,
  isUpdatingStatus,
  onSendToQueue,
  onCancel,
}: AppointmentRowProps) => {
  const linkParams = useMemo(
    () => ({ patientId: apt.patientId }),
    [apt.patientId],
  );

  const isRowBusy = enqueuingPatientId === apt.patientId || isUpdatingStatus;
  const badgeClass = getAppointmentBadgeClass(apt.status);

  const reasonDisplay =
    apt.reason !== null && apt.reason !== ''
      ? apt.reason
      : 'Pediatric consultation';

  return (
    <TableRow>
      <TableCell>
        <span className="text-xs font-bold text-foreground">
          {new Date(apt.scheduledAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </TableCell>
      <TableCell>
        <Link
          className="text-sm font-semibold text-foreground hover:underline"
          params={linkParams}
          to="/patients/$patientId"
        >
          {apt.patient.firstName} {apt.patient.lastName}
        </Link>
      </TableCell>
      <TableCell>
        <span className="font-mono text-xs text-muted-foreground">
          {apt.patient.mrn}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">{reasonDisplay}</span>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {apt.durationMinutes} min
        </span>
      </TableCell>
      <TableCell>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${badgeClass}`}
        >
          {apt.status}
        </span>
      </TableCell>
      <TableCell className="text-end">
        <div className="flex items-center justify-end gap-2">
          <Button
            disabled={isRowBusy || apt.status === 'cancelled'}
            onClick={() => onSendToQueue(apt.id, apt.patientId)}
            size="sm"
            title="Check-in & send to waiting room"
            type="button"
            variant="outline"
          >
            <span className="me-1 inline-flex text-sm">
              <MaterialIcon name="check" />
            </span>
            <span>Arrived (Queue)</span>
          </Button>
          {apt.status === 'scheduled' && (
            <Button
              disabled={isRowBusy}
              onClick={() => onCancel(apt.id)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
          )}
          <Link params={linkParams} to="/patients/$patientId">
            <Button size="sm" type="button" variant="ghost">
              Chart
            </Button>
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
};

const AppointmentsComponent = () => {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const clinicId = useActiveClinicId();
  const [isBookOpen, setIsBookOpen] = useState(false);

  const { data: appointments, isLoading } = useTodayAppointments(clinicId);
  const { patients } = usePatientList({ clinicId });

  const { create: createAppointment, isPending: isCreating } =
    useCreateAppointment();

  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useUpdateAppointmentStatus();

  const enqueueMutation = useEnqueuePatient();

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [formError, setFormError] = useState<string | null>(null);

  const [enqueuingPatientId, setEnqueuingPatientId] = useState<string | null>(
    null,
  );

  const filteredAppointments = useMemo(
    () =>
      (appointments ?? []).filter((apt) => {
        if (search.status !== 'all' && apt.status !== search.status) {
          return false;
        }

        if (search.date !== undefined && search.date !== '') {
          const [aptDate] = new Date(apt.scheduledAt).toISOString().split('T');

          if (aptDate !== search.date) {
            return false;
          }
        }

        return true;
      }),
    [appointments, search.status, search.date],
  );

  const resetBookingForm = () => {
    setSelectedPatientId('');
    setScheduledAt('');
    setReason('');
    setDurationMinutes('30');
    setFormError(null);
  };

  const handleBookSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (selectedPatientId === '' || scheduledAt === '') {
      setFormError('Please select a patient and choose a date and time.');

      return;
    }

    const parsedDate = new Date(scheduledAt);

    if (Number.isNaN(parsedDate.getTime())) {
      setFormError('Invalid date or time selected.');

      return;
    }

    const parsedDuration = Math.trunc(Number(durationMinutes));
    const trimmedReason = reason.trim();

    await createAppointment({
      clinicId,
      patientId: selectedPatientId,
      scheduledAt: parsedDate,
      reason: trimmedReason === '' ? 'Pediatric consultation' : trimmedReason,
      durationMinutes: Number.isFinite(parsedDuration) ? parsedDuration : 30,
    });

    resetBookingForm();
    setIsBookOpen(false);
  };

  const handleSendToQueue = async (
    appointmentId: string,
    patientId: string,
  ) => {
    setEnqueuingPatientId(patientId);

    try {
      await enqueueMutation.mutateAsync({
        clinicId,
        patientId,
        priority: 0,
      });
      await updateStatus({
        id: appointmentId,
        status: 'completed',
      });
    } catch {
      // Mutation hooks handle failure notifications.
    }

    setEnqueuingPatientId(null);
  };

  const handleStatusChange = async (
    appointmentId: string,
    nextStatus: 'completed' | 'cancelled' | 'no-show',
  ) => {
    await updateStatus({
      id: appointmentId,
      status: nextStatus,
    });
  };

  const clearDateFilter = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        date: undefined,
      }),
      replace: true,
    }).catch(() => null);
  };

  const reasonSelectValue = VISIT_REASONS.some((item) => item === reason)
    ? reason
    : '';

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 p-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    if (filteredAppointments.length === 0) {
      return (
        <div className="py-12 text-center">
          <span className="inline-flex text-4xl text-muted-foreground/50">
            <MaterialIcon name="event_busy" />
          </span>
          <p className="mt-2 font-medium text-muted-foreground">
            No appointments match the current view
          </p>
          <p className="text-xs text-muted-foreground/80">
            Click &ldquo;Book Appointment&rdquo; to schedule an upcoming patient
            visit.
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Child Name</TableHead>
            <TableHead>MRN</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAppointments.map((apt) => (
            <AppointmentRow
              apt={apt}
              enqueuingPatientId={enqueuingPatientId}
              isUpdatingStatus={isUpdatingStatus}
              key={apt.id}
              onCancel={(id) => {
                handleStatusChange(id, 'cancelled').catch(() => null);
              }}
              onSendToQueue={(id, patientId) => {
                handleSendToQueue(id, patientId).catch(() => null);
              }}
            />
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
              <MaterialIcon name="calendar_month" />
            </span>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Appointment Scheduling (جدول المواعيد)
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage pediatric &amp; lactation clinic bookings, routine checks,
            and follow-ups — Dr. Hazem Ali
          </p>
        </div>

        <Dialog
          onOpenChange={(open) => {
            setIsBookOpen(open);

            if (!open) {
              setFormError(null);
            }
          }}
          open={isBookOpen}
        >
          <DialogTrigger>
            <Button type="button">
              <span className="me-1.5 inline-flex">
                <MaterialIcon name="add_task" />
              </span>
              <span>Book Appointment</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book Clinic Appointment</DialogTitle>
              <DialogDescription>
                Schedule a child or lactation visit with the clinic.
              </DialogDescription>
            </DialogHeader>

            <form
              className="space-y-4 py-2"
              onSubmit={(e) => {
                handleBookSubmit(e).catch(() => null);
              }}
            >
              <div>
                <Label htmlFor="patientSelect">Select Patient *</Label>
                <Select
                  onValueChange={(val) => {
                    if (val !== '') {
                      setSelectedPatientId(val);
                    }
                  }}
                  value={selectedPatientId}
                >
                  <SelectTrigger id="patientSelect">
                    <SelectValue placeholder="Select patient chart..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} (MRN: {p.mrn})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateTime">Date &amp; Time *</Label>
                <Input
                  id="dateTime"
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  type="datetime-local"
                  value={scheduledAt}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reasonPreset">Reason for Visit</Label>
                <Select
                  onValueChange={(v) => {
                    if (v !== '') {
                      setReason(v);
                    }
                  }}
                  value={reasonSelectValue}
                >
                  <SelectTrigger id="reasonPreset">
                    <SelectValue placeholder="Choose common reason or type below" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_REASONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  aria-label="Custom reason for visit"
                  id="reason"
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Or type custom visit reason..."
                  type="text"
                  value={reason}
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (Minutes)</Label>
                <Select
                  onValueChange={(v) => {
                    if (v !== '') {
                      setDurationMinutes(v);
                    }
                  }}
                  value={durationMinutes}
                >
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">
                      15 minutes (Quick follow-up)
                    </SelectItem>
                    <SelectItem value="30">
                      30 minutes (Standard consultation)
                    </SelectItem>
                    <SelectItem value="45">
                      45 minutes (Detailed assessment)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formError !== null && formError !== '' && (
                <p className="text-xs font-medium text-destructive">
                  {formError}
                </p>
              )}

              <DialogFooter>
                <Button
                  onClick={() => {
                    setIsBookOpen(false);
                    setFormError(null);
                  }}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={isCreating} type="submit">
                  {isCreating ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Label htmlFor="statusFilter">Status:</Label>
          <Select
            onValueChange={(v) => {
              if (isAppointmentStatusFilter(v)) {
                navigate({
                  search: (prev) => ({
                    ...prev,
                    status: v,
                  }),
                  replace: true,
                }).catch(() => null);
              }
            }}
            value={search.status}
          >
            <SelectTrigger className="w-40" id="statusFilter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {search.date !== undefined && search.date !== '' && (
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
            <span>Date filter: {search.date}</span>
            <button
              aria-label="Clear date filter"
              className="cursor-pointer font-bold text-muted-foreground hover:text-foreground"
              onClick={clearDateFilter}
              type="button"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Appointments Table */}
      <div className="rounded-xl border border-border bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="text-base font-bold text-foreground">
                Today&apos;s Appointment Schedule
              </span>
            </CardTitle>
            <CardDescription>
              All reserved outpatient consults for today (
              {filteredAppointments.length})
            </CardDescription>
          </CardHeader>
          <CardContent>{renderTableBody()}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_app/appointments')({
  staticData: routeShell.app,
  component: AppointmentsComponent,
  validateSearch: appointmentsSearchSchema,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
      throw redirect({ to: '/login' });
    }

    return { session };
  },
});
