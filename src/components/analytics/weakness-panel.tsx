// apps/web/src/components/analytics/WeaknessPanel.tsx

import { Link } from '@tanstack/react-router';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/material-icon';
import { formatLabel } from '@/utils/format';

import { LastSyncedBadge } from './shared';

export interface ClinicalCareGap {
  type: 'immunization' | 'growth' | 'documentation';
  name: string;
  totalEncounters: number;
  adherencePct: number;
}

interface WeaknessPanelProps {
  careGaps: Array<ClinicalCareGap> | undefined;
  recommendations: Array<string> | undefined;
  dataUpdatedAt?: number;
}

const TYPE_ICON_MAP: Record<ClinicalCareGap['type'], string> = {
  immunization: 'vaccines',
  growth: 'show_chart',
  documentation: 'clinical_notes',
};

const TYPE_LABEL_MAP: Record<ClinicalCareGap['type'], string> = {
  immunization: 'Immunization',
  growth: 'Growth',
  documentation: 'Protocol',
};

const TYPE_ROUTE_MAP: Record<
  ClinicalCareGap['type'],
  '/immunizations' | '/growth' | '/patients'
> = {
  immunization: '/immunizations',
  growth: '/growth',
  documentation: '/patients',
};

const getTypeIcon = (type: ClinicalCareGap['type']): string =>
  TYPE_ICON_MAP[type];

const getTypeLabel = (type: ClinicalCareGap['type']): string =>
  TYPE_LABEL_MAP[type];

const getTypeRoute = (type: ClinicalCareGap['type']) => TYPE_ROUTE_MAP[type];

const getSeverityColor = (pct: number): string => {
  if (pct < 50) {
    return 'text-destructive';
  }

  if (pct < 75) {
    return 'text-warning';
  }

  return 'text-chart-2';
};

const getSeverityLabel = (pct: number): string => {
  if (pct < 50) {
    return 'High priority';
  }

  if (pct < 75) {
    return 'Needs attention';
  }

  return 'On track';
};

export const WeaknessPanel = ({
  careGaps,
  recommendations,
  dataUpdatedAt,
}: WeaknessPanelProps) => {
  const hasData = careGaps !== undefined && careGaps.length > 0;

  return (
    <div className="rounded-xl border-2 border-border bg-card shadow-sm">
      <Card>
        <CardHeader>
          <div className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>
              <span className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                <span className="inline-flex text-destructive">
                  <MaterialIcon name="analytics" />
                </span>
                <span>Clinical Care Gaps &amp; Quality Insights</span>
              </span>
            </CardTitle>
            {dataUpdatedAt !== undefined && (
              <LastSyncedBadge dataUpdatedAt={dataUpdatedAt} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="space-y-6">
              <div className="space-y-2">
                {careGaps.map((gap) => (
                  <div
                    className="flex items-center gap-3 rounded-xl border-2 border-border bg-muted/40 p-4"
                    key={`${gap.type}-${gap.name}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <span className="inline-flex text-muted-foreground">
                        <MaterialIcon name={getTypeIcon(gap.type)} />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {getTypeLabel(gap.type)}
                        </span>
                        <span
                          className={`text-xs font-medium ${getSeverityColor(gap.adherencePct)}`}
                        >
                          {getSeverityLabel(gap.adherencePct)}
                        </span>
                      </div>
                      <div className="truncate text-sm font-semibold text-foreground">
                        {formatLabel(gap.name)}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {gap.totalEncounters} encounters · {gap.adherencePct}%
                        adherence
                      </div>
                    </div>
                    <Link
                      className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                      to={getTypeRoute(gap.type)}
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>

              {recommendations !== undefined && recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    Clinical Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {recommendations.map((rec) => (
                      <li
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                        key={rec}
                      >
                        <span className="mt-0.5 inline-flex shrink-0 text-warning">
                          <MaterialIcon name="lightbulb" />
                        </span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <span className="mx-auto mb-3 inline-flex text-5xl text-muted-foreground/50">
                <MaterialIcon name="insights" />
              </span>
              <p className="font-semibold text-foreground">
                Not enough encounter data yet
              </p>
              <p className="mt-1 text-sm">
                Record more pediatric visits, growth measurements, and vaccines
                to surface care gaps.
              </p>
              <Link
                className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                to="/patients"
              >
                View Patients
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
