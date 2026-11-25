// apps/web/src/components/analytics/TimeAnalyticsPanel.tsx

import type { ChartConfig, ChartDataPoint } from '@/components/ui/chart';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, ChartContainer, ChartLegend } from '@/components/ui/chart';
import { formatLabel, formatTime } from '@/utils/format';

import { CHART_COLORS, EmptyChartState, formatShortDate } from './shared';

export interface DomainTimeItem {
  domainName: string;
  avgTimeSpentSec: number;
  totalTimeSpentSec: number;
}

export interface VisitTypeTimeItem {
  visitType: string;
  avgTimeSpentSec: number;
  totalTimeSpentSec: number;
}

export interface TimeTrendItem {
  date: string;
  avgTimeSpentSec: number;
}

interface TimeAnalyticsPanelProps {
  domainTime: Array<DomainTimeItem> | undefined;
  visitTypeTime: Array<VisitTypeTimeItem> | undefined;
  timeTrend: Array<TimeTrendItem> | undefined;
}

const TIME_TREND_CHART_CONFIG: ChartConfig = {
  avgTimeSpentSec: {
    label: 'Avg Consult Duration (sec)',
    color: CHART_COLORS[1],
  },
};

const TIME_TREND_COLORS = [CHART_COLORS[1]];
const TIME_TREND_KEYS = ['avgTimeSpentSec'];

const WIDTH_STEPS = [
  'w-0',
  'w-1/12',
  'w-2/12',
  'w-3/12',
  'w-4/12',
  'w-5/12',
  'w-6/12',
  'w-7/12',
  'w-8/12',
  'w-9/12',
  'w-10/12',
  'w-11/12',
  'w-full',
] as const;

const getDurationWidthClass = (avgSeconds: number): string => {
  const pct = Math.min(100, (avgSeconds / 1800) * 100);

  const step = Math.max(
    pct > 0 ? 1 : 0,
    Math.min(12, Math.round((pct / 100) * 12)),
  );

  return WIDTH_STEPS[step] ?? 'w-0';
};

export const TimeAnalyticsPanel = ({
  domainTime,
  visitTypeTime,
  timeTrend,
}: TimeAnalyticsPanelProps) => {
  const trendChartData = useMemo<Array<ChartDataPoint>>(
    () =>
      (timeTrend ?? []).map((item) => ({
        date: item.date,
        label: formatShortDate(item.date),
        avgTimeSpentSec: item.avgTimeSpentSec,
      })),
    [timeTrend],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-border bg-card shadow-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="font-heading text-lg font-bold text-foreground">
                Consultation Time by Care Domain
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {domainTime !== undefined && domainTime.length > 0 ? (
              <div className="space-y-3">
                {domainTime.map((item) => (
                  <div
                    className="flex items-center gap-4"
                    key={item.domainName}
                  >
                    <div className="w-36 shrink-0 truncate text-sm font-medium text-foreground">
                      {item.domainName}
                    </div>
                    <div className="flex-1">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full bg-chart-6 ${getDurationWidthClass(item.avgTimeSpentSec)}`}
                        />
                      </div>
                    </div>
                    <div className="w-24 shrink-0 text-right text-sm text-muted-foreground">
                      {formatTime(item.avgTimeSpentSec)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyChartState
                ctaLabel="Open Clinic Queue"
                heightClass="h-40"
                message="No consultation duration data by care domain yet."
                to="/queue"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border-2 border-border bg-card shadow-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="font-heading text-lg font-bold text-foreground">
                Duration by Visit Type
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visitTypeTime !== undefined && visitTypeTime.length > 0 ? (
              <div className="space-y-3">
                {visitTypeTime.map((item) => (
                  <div className="flex items-center gap-4" key={item.visitType}>
                    <div className="w-36 shrink-0 truncate text-sm font-medium text-foreground">
                      {formatLabel(item.visitType)}
                    </div>
                    <div className="flex-1">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full bg-chart-3 ${getDurationWidthClass(item.avgTimeSpentSec)}`}
                        />
                      </div>
                    </div>
                    <div className="w-24 shrink-0 text-right text-sm text-muted-foreground">
                      {formatTime(item.avgTimeSpentSec)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyChartState
                ctaLabel="Open Clinic Queue"
                heightClass="h-40"
                message="No duration data by visit type yet."
                to="/queue"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border-2 border-border bg-card shadow-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="font-heading text-lg font-bold text-foreground">
                Daily Average Consultation Time
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendChartData.length > 0 ? (
              <>
                <ChartContainer config={TIME_TREND_CHART_CONFIG} height={200}>
                  <BarChart
                    colors={TIME_TREND_COLORS}
                    data={trendChartData}
                    dataKeys={TIME_TREND_KEYS}
                    height={200}
                    xAxisKey="label"
                  />
                </ChartContainer>
                <ChartLegend config={TIME_TREND_CHART_CONFIG} />
              </>
            ) : (
              <EmptyChartState
                ctaLabel="Open Clinic Queue"
                heightClass="h-40"
                message="No daily consultation trend data yet."
                to="/queue"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
