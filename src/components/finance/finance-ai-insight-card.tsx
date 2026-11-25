import type { LedgerDateRange } from '@/hooks/use-finance';

// apps/web/src/components/finance/FinanceAiInsightCard.tsx
import { Badge } from '@/components/ui/badge';
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
import { useActiveClinicId } from '@/hooks/use-active-clinic';
import { useFinanceAiInsight } from '@/hooks/use-finance';

interface Props {
  range?: LedgerDateRange;
}

export function FinanceAiInsightCard({ range }: Props) {
  const clinicId = useActiveClinicId();

  const {
    data: insight,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useFinanceAiInsight(clinicId, range);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || insight === undefined) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex text-destructive">
                <MaterialIcon name="error_outline" />
              </span>
              <CardTitle>Financial Health Summary Unavailable</CardTitle>
            </div>
            <Button
              disabled={isFetching}
              onClick={() => {
                refetch().catch(() => null);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <span
                className={`me-1 inline-flex text-sm ${isFetching ? 'animate-spin' : ''}`}
              >
                <MaterialIcon name="refresh" />
              </span>
              Retry
            </Button>
          </div>
          <CardDescription>
            <span className="text-xs text-destructive">
              {error instanceof Error
                ? error.message
                : 'Unable to load financial scorecard at this time (تعذر تحميل التقرير المالي الذكي).'}
            </span>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isHealthy = insight.status === 'healthy';

  let scoreColor = 'border-destructive/30 bg-destructive/10 text-destructive';

  if (insight.healthScore >= 80) {
    scoreColor =
      'border-brand-success/30 bg-brand-success/10 text-brand-success';
  } else if (insight.healthScore >= 60) {
    scoreColor = 'border-warning/30 bg-warning/10 text-warning';
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-base text-primary">
              <MaterialIcon name="auto_awesome" />
            </div>
            <CardTitle>AI Financial Advisory &amp; Health Scorecard</CardTitle>
            <Badge variant={isHealthy ? 'success' : 'warning'}>
              {insight.status}
            </Badge>
          </div>
          <CardDescription className="mt-1">
            Automated summary of clinic revenue, expenses, and balance
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs font-bold ${scoreColor}`}
          >
            <span className="inline-flex text-sm">
              <MaterialIcon name="speed" />
            </span>
            <span>{insight.healthScore} / 100</span>
          </div>
          <Button
            disabled={isFetching}
            onClick={() => {
              refetch().catch(() => null);
            }}
            size="icon-sm"
            title="Refresh financial summary"
            type="button"
            variant="ghost"
          >
            <span
              className={`inline-flex text-base ${isFetching ? 'animate-spin' : ''}`}
            >
              <MaterialIcon name="refresh" />
            </span>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3.5">
            <p className="text-xs leading-relaxed font-medium text-foreground">
              {insight.summaryEn}
            </p>
            <p className="text-end font-sans text-xs leading-relaxed text-muted-foreground">
              {insight.summaryAr}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-success/15 text-xl text-brand-success">
                <MaterialIcon name="trending_up" />
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Leading Revenue Driver
                </span>
                <p className="text-xs font-bold text-foreground">
                  {insight.topRevenueSource}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-xl text-destructive">
                <MaterialIcon name="pie_chart" />
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Primary Cost Center
                </span>
                <p className="text-xs font-bold text-foreground">
                  {insight.topExpenseSource}
                </p>
              </div>
            </div>
          </div>

          {insight.recommendations.length > 0 && (
            <div className="space-y-2">
              <span className="flex items-center gap-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                <span className="inline-flex text-sm text-warning">
                  <MaterialIcon name="lightbulb" />
                </span>
                Financial Recommendations
              </span>
              <div className="grid grid-cols-1 gap-2">
                {insight.recommendations.map((rec) => (
                  <div
                    className="space-y-1 rounded-lg border border-border bg-card p-2.5 text-xs text-foreground"
                    key={rec.en}
                  >
                    <p className="font-medium text-foreground">• {rec.en}</p>
                    <p className="text-end font-sans text-muted-foreground">
                      • {rec.ar}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
