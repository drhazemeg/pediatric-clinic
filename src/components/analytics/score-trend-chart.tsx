// apps/web/src/components/analytics/ScoreTrendChart.tsx

import type { ChartConfig, ChartDataPoint } from '@/components/ui/chart';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, ChartContainer, ChartLegend } from '@/components/ui/chart';

import { CHART_COLORS, EmptyChartState, formatShortDate } from './shared';

export interface ClinicalTrendPoint {
  date: string;
  visits: number;
  adherencePct: number;
}

interface ScoreTrendChartProps {
  data: Array<ClinicalTrendPoint> | undefined;
}

const ADHERENCE_CHART_CONFIG: ChartConfig = {
  adherencePct: {
    label: 'Adherence Rate (%)',
    color: CHART_COLORS[0],
  },
};

const ADHERENCE_COLORS = [CHART_COLORS[0]];
const ADHERENCE_KEYS = ['adherencePct'];

export const ScoreTrendChart = ({ data }: ScoreTrendChartProps) => {
  const chartData = useMemo<Array<ChartDataPoint>>(
    () =>
      (data ?? []).map((d) => ({
        ...d,
        label: formatShortDate(d.date),
      })),
    [data],
  );

  const latestPoint =
    data !== undefined && data.length > 0 ? data.at(-1) : null;

  const latestRaw = latestPoint?.adherencePct ?? null;

  const statusLabel = useMemo(() => {
    if (latestRaw === null) {
      return null;
    }

    if (latestRaw >= 85) {
      return 'Optimal';
    }

    if (latestRaw >= 70) {
      return 'On Track';
    }

    return 'Needs Review';
  }, [latestRaw]);

  if (data === undefined || data.length === 0) {
    return (
      <div className="rounded-xl border-2 border-border bg-card shadow-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="font-heading text-lg font-bold text-foreground">
                Clinical Adherence Trend
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyChartState
              ctaLabel="Open Clinic Queue"
              heightClass="h-64"
              message="Complete patient encounters to track protocol adherence over time."
              to="/queue"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-border bg-card shadow-sm">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="font-heading text-lg font-bold text-foreground">
              Clinical Adherence Trend (30 Days)
            </span>
          </CardTitle>
          {statusLabel !== null && latestRaw !== null && (
            <span className="mt-0.5 text-sm text-muted-foreground">
              Latest: {latestRaw}% — {statusLabel}
            </span>
          )}
        </CardHeader>
        <CardContent>
          <ChartContainer config={ADHERENCE_CHART_CONFIG} height={256}>
            <AreaChart
              colors={ADHERENCE_COLORS}
              data={chartData}
              dataKeys={ADHERENCE_KEYS}
              height={256}
              xAxisKey="label"
            />
          </ChartContainer>
          <ChartLegend config={ADHERENCE_CHART_CONFIG} />
        </CardContent>
      </Card>
    </div>
  );
};
