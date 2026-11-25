// apps/web/src/components/growth/GrowthPercentileChart.tsx
// WHO & Egyptian Anthropometric Growth Charts using @/components/ui/chart (@tanstack/charts)

import type { ChartConfig, ChartDataPoint } from '@/components/ui/chart';

import { useMemo } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AreaChart,
  ChartContainer,
  ChartLegend,
  LineChart,
} from '@/components/ui/chart';

export interface GrowthCurvePoint {
  ageMonths: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
  childValue?: number;
}

interface GrowthPercentileChartProps {
  title: string;
  indicator:
    | 'weight-for-age'
    | 'length-for-age'
    | 'head-circumference-for-age'
    | 'bmi-for-age';
  standard?: 'who' | 'egypt';
  sex: 'male' | 'female';
  unit: string;
  curveData: Array<GrowthCurvePoint>;
  childMeasurements?: Array<{
    ageMonths: number;
    value: number;
    zScore?: number;
    date?: string;
  }>;
}

const PERCENTILE_BAND_CONFIG: ChartConfig = {
  p97: { label: '97th (+2 SD)', color: '#f59e0b' },
  p85: { label: '85th (+1 SD)', color: '#10b981' },
  p50: { label: '50th Median', color: '#059669' },
  p15: { label: '15th (-1 SD)', color: '#ef4444' },
  p3: { label: '3rd (-2 SD)', color: '#b91c1c' },
};

const BAND_KEYS = ['p97', 'p85', 'p50', 'p15', 'p3'];
const BAND_COLORS = ['#f59e0b', '#10b981', '#059669', '#ef4444', '#b91c1c'];
const CHILD_KEYS = ['childValue'];
const CHILD_COLORS = ['#047857'];

const EMPTY_MEASUREMENTS: NonNullable<
  GrowthPercentileChartProps['childMeasurements']
> = [];

export const GrowthPercentileChart = ({
  title,
  standard = 'who',
  sex,
  unit,
  curveData,
  childMeasurements = EMPTY_MEASUREMENTS,
}: GrowthPercentileChartProps) => {
  const bandData = useMemo<Array<ChartDataPoint>>(
    () =>
      curveData.map((pt) => ({
        ageLabel: `${pt.ageMonths}m`,
        ageMonths: pt.ageMonths,
        p97: pt.p97,
        p85: pt.p85,
        p50: pt.p50,
        p15: pt.p15,
        p3: pt.p3,
      })),
    [curveData],
  );

  const childPoints = useMemo<Array<ChartDataPoint>>(
    () =>
      childMeasurements
        .toSorted((a, b) => a.ageMonths - b.ageMonths)
        .map((m) => ({
          ageLabel: `${m.ageMonths.toFixed(1)}m`,
          childValue: m.value,
        })),
    [childMeasurements],
  );

  const childConfig = useMemo<ChartConfig>(
    () => ({
      childValue: {
        label: `Child (${unit})`,
        color: '#047857',
      },
    }),
    [unit],
  );

  const sexLabel = sex === 'male' ? 'Boys (الأولاد)' : 'Girls (البنات)';

  const standardLabel =
    standard === 'who'
      ? 'WHO Child Growth Standards'
      : 'Egyptian National Reference Curves';

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <div>
              <CardTitle>
                <span className="text-base font-bold text-foreground">
                  {title} ({unit})
                </span>
              </CardTitle>
              <CardDescription>
                <span className="text-xs">
                  {standardLabel} &bull; {sexLabel}
                </span>
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-primary">
              Child Measurements (الطفل)
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 pt-1">
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                Reference Percentile Bands ({unit})
              </p>
              <ChartContainer config={PERCENTILE_BAND_CONFIG} height={280}>
                <AreaChart
                  colors={BAND_COLORS}
                  data={bandData}
                  dataKeys={BAND_KEYS}
                  height={280}
                  xAxisKey="ageLabel"
                />
              </ChartContainer>
              <ChartLegend config={PERCENTILE_BAND_CONFIG} />
            </div>

            {childPoints.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-1 text-xs font-semibold text-foreground">
                  Recorded Child Measurements ({unit})
                </p>
                <ChartContainer config={childConfig} height={180}>
                  <LineChart
                    colors={CHILD_COLORS}
                    data={childPoints}
                    dataKeys={CHILD_KEYS}
                    height={180}
                    xAxisKey="ageLabel"
                  />
                </ChartContainer>
                <ChartLegend config={childConfig} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
