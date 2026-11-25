// apps/web/src/routes/jobs.tsx

import { createFileRoute, redirect } from '@tanstack/react-router';

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
import { useJobs } from '@/hooks/use-jobs';
import { authClient } from '@/lib/auth-client';
import { routeShell } from '@/lib/web/route-shell';

const TASK_LABEL_ENTRIES: Array<[string, string]> = [
  ['ai_soap_draft', 'AI SOAP Note Drafting'],
  ['ai_patient_education', 'Bilingual Parent Education Instructions'],
  ['ai_differential_dx', 'Differential Diagnosis Support'],
  ['ai_dosing_safety', 'Pediatric Dosing Safety Verification'],
  ['ai_growth_interpretation', 'Growth & Anthropometry Insights'],
  ['ai_immunization_advice', 'Immunization Catch-Up Guidance'],
  ['growth_recalc', 'Batch Growth Percentiles Recalculation'],
  ['immunization_schedule_refresh', 'National MOH Schedule Sync'],
];

const TASK_LABELS = new Map<string, string>(TASK_LABEL_ENTRIES);

const getTaskLabel = (kind: string): string => TASK_LABELS.get(kind) ?? kind;

const getJobStatusClass = (status: string): string => {
  switch (status) {
    case 'completed': {
      return 'bg-chart-2/15 text-chart-2';
    }

    case 'failed': {
      return 'bg-destructive/15 text-destructive';
    }

    case 'cancelled': {
      return 'bg-muted text-muted-foreground';
    }

    default: {
      return 'bg-chart-6/15 text-chart-6';
    }
  }
};

interface JobHistoryRow {
  id: string;
  kind: string;
  status: string;
  createdAt: Date;
  errorMessage?: string | null;
  resultJson?: unknown;
}

const renderJobDetails = (job: JobHistoryRow) => {
  if (
    job.errorMessage !== null &&
    job.errorMessage !== undefined &&
    job.errorMessage !== ''
  ) {
    return (
      <span className="font-semibold text-destructive">{job.errorMessage}</span>
    );
  }

  if (job.resultJson !== null && job.resultJson !== undefined) {
    return (
      <span className="font-medium text-chart-2">Ready (Output generated)</span>
    );
  }

  return '-';
};

const JobsMonitorComponent = () => {
  const { activeJobs, activeCount, completedResults, removeJob, myJobsQuery } =
    useJobs();

  const jobList = myJobsQuery.data?.items ?? [];
  const { isLoading } = myJobsQuery;

  const renderHistoryContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 p-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (jobList.length === 0 && Object.keys(completedResults).length === 0) {
      return (
        <div className="py-12 text-center">
          <span className="inline-flex text-4xl text-muted-foreground/50">
            <MaterialIcon name="task_alt" />
          </span>
          <p className="mt-2 font-medium text-muted-foreground">
            No clinical tasks logged
          </p>
          <p className="text-xs text-muted-foreground/80">
            Background jobs triggered from encounter SOAP notes or calculators
            will appear here.
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Details / Result</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobList.map((job: JobHistoryRow) => (
            <TableRow key={job.id}>
              <TableCell>
                <p className="text-xs font-bold text-foreground">
                  {getTaskLabel(job.kind)}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {job.id}
                </p>
              </TableCell>
              <TableCell>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${getJobStatusClass(job.status)}`}
                >
                  {job.status}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {new Date(job.createdAt).toLocaleString([], {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {renderJobDetails(job)}
                </span>
              </TableCell>
              <TableCell className="text-end">
                {job.status === 'failed' && (
                  <Button
                    onClick={() => removeJob(job.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Dismiss
                  </Button>
                )}
              </TableCell>
            </TableRow>
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
            <MaterialIcon name="psychology" />
          </span>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Clinical Task &amp; AI Processing Monitor
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time status of asynchronous clinical intelligence tasks, SOAP
          note drafting, and safety audits
        </p>
      </div>

      {/* Active Jobs Live Banner (if any running) */}
      {activeCount > 0 && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 pb-1">
                <span className="inline-flex animate-spin text-primary">
                  <MaterialIcon name="sync" />
                </span>
                <CardTitle>
                  <span className="text-sm font-bold text-foreground">
                    {activeCount} Active Clinical Job
                    {activeCount > 1 ? 's' : ''} Processing
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {activeJobs.map((job) => (
                  <div
                    className="flex items-center justify-between py-2 text-xs"
                    key={job.id}
                  >
                    <div>
                      <p className="font-bold text-foreground">
                        {getTaskLabel(job.kind)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        ID: {job.id} &bull; Status: {job.status}
                      </p>
                    </div>
                    <Button
                      onClick={() => removeJob(job.id)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Dismiss
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Jobs History Table */}
      <div className="rounded-xl border border-border bg-card">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  <span className="text-base font-bold text-foreground">
                    Task History &amp; Audit Trail
                  </span>
                </CardTitle>
                <CardDescription>
                  Recent background jobs and AI assistance requests
                </CardDescription>
              </div>
              <Button
                disabled={myJobsQuery.isFetching}
                onClick={() => {
                  myJobsQuery.refetch().catch(() => null);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <span
                  className={`me-1 inline-flex text-xs ${myJobsQuery.isFetching ? 'animate-spin' : ''}`}
                >
                  <MaterialIcon name="refresh" />
                </span>
                <span>Refresh</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>{renderHistoryContent()}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_app/jobs')({
  staticData: routeShell.app,
  component: JobsMonitorComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
      throw redirect({ to: '/login' });
    }

    return { session };
  },
});
