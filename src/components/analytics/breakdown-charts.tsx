// apps/web/src/components/analytics/BreakdownCharts.tsx

import type { ChartConfig, ChartDataPoint } from '@/components/ui/chart';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, ChartContainer, ChartLegend } from '@/components/ui/chart';
import { formatLabel, formatTime } from '@/utils/format';

import { CHART_COLORS, EmptyChartState } from './shared';

export interface ClinicalCategoryItem {
  categoryId: string;
  categoryName: string;
  compliancePct: number;
  avgScorePct: number;
  /** Average encounter duration in seconds */
  avgDurationSec: number;
  encounters: number;
}

export interface CareDomainItem {
  domainId: string;
  domainName: string;
  compliancePct: number;
  avgScorePct: number;
  /** Average care-domain duration in seconds */
  avgDurationSec: number;
  encounters: number;
}

export interface EncounterFormatItem {
  format: string;
  compliancePct: number;
  /** Average duration per individual item in seconds (formatTime expects seconds) */
  avgDurationSec: number;
  /** Total number of items recorded for this format */
  totalItems: number;
}

interface BreakdownChartsProps {
  byCategory: Array<ClinicalCategoryItem> | undefined;
  byDomain: Array<CareDomainItem> | undefined;
  byFormat: Array<EncounterFormatItem> | undefined;
}

const COMPLIANCE_CHART_CONFIG: ChartConfig = {
  compliancePct: {
    label: 'Protocol Adherence (%)',
    color: CHART_COLORS[0],
  },
};

const CATEGORY_COLORS = [CHART_COLORS[0]];
const DOMAIN_COLORS = [CHART_COLORS[2]];
const COMPLIANCE_DATA_KEYS = ['compliancePct'];

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

const getBarWidthClass = (pct: number): string => {
  const step = Math.max(
    pct > 0 ? 1 : 0,
    Math.min(12, Math.round((pct / 100) * 12)),
  );

  return WIDTH_STEPS[step] ?? 'w-0';
};

const getAdherenceBarColor = (pct: number): string => {
  if (pct >= 80) {
    return 'bg-chart-2';
  }

  if (pct >= 60) {
    return 'bg-warning';
  }

  return 'bg-destructive';
};

const AdherenceBar = ({ pct }: { pct: number }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
    <div
      className={`h-full rounded-full transition-all ${getAdherenceBarColor(pct)} ${getBarWidthClass(pct)}`}
    />
  </div>
);

export const BreakdownCharts = ({
  byCategory,
  byDomain,
  byFormat,
}: BreakdownChartsProps) => {
  const categoryData = useMemo<Array<ChartDataPoint>>(
    () =>
      (byCategory ?? []).map((item) => ({
        categoryName: item.categoryName,
        compliancePct: item.compliancePct,
        avgScorePct: item.avgScorePct,
      })),
    [byCategory],
  );

  const domainData = useMemo<Array<ChartDataPoint>>(
    () =>
      (byDomain ?? []).map((item) => ({
        domainName: item.domainName,
        compliancePct: item.compliancePct,
        avgScorePct: item.avgScorePct,
      })),
    [byDomain],
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border-2 border-border bg-card shadow-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="font-heading text-lg font-bold text-foreground">
                Performance by Clinical Category
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <>
                <ChartContainer config={COMPLIANCE_CHART_CONFIG} height={220}>
                  <BarChart
                    colors={CATEGORY_COLORS}
                    data={categoryData}
                    dataKeys={COMPLIANCE_DATA_KEYS}
                    height={220}
                    xAxisKey="categoryName"
                  />
                </ChartContainer>
                <ChartLegend config={COMPLIANCE_CHART_CONFIG} />
              </>
            ) : (
              <EmptyChartState message="No clinical category data available yet." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border-2 border-border bg-card shadow-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="font-heading text-lg font-bold text-foreground">
                Performance by Care Domain
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {domainData.length > 0 ? (
              <>
                <ChartContainer config={COMPLIANCE_CHART_CONFIG} height={220}>
                  <BarChart
                    colors={DOMAIN_COLORS}
                    data={domainData}
                    dataKeys={COMPLIANCE_DATA_KEYS}
                    height={220}
                    xAxisKey="domainName"
                  />
                </ChartContainer>
                <ChartLegend config={COMPLIANCE_CHART_CONFIG} />
              </>
            ) : (
              <EmptyChartState message="No care domain data available yet." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border-2 border-border bg-card shadow-sm lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="font-heading text-lg font-bold text-foreground">
                Performance by Assessment / Visit Format
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byFormat !== undefined && byFormat.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {byFormat.map((item) => (
                  <div
                    className="rounded-xl border-2 border-border bg-muted/40 p-4"
                    key={item.format}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">
                        {formatLabel(item.format)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.totalItems} items
                      </span>
                    </div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">
                        {item.compliancePct}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(item.avgDurationSec)} avg/item
                      </span>
                    </div>
                    <AdherenceBar pct={item.compliancePct} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyChartState message="No assessment format data available yet." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
