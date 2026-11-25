// apps/web/src/components/finance/FinanceCashFlowChart.tsx

import type { ChartConfig } from '@/components/ui/chart';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  AreaChart,
  BarChart,
  ChartContainer,
  ChartLegend,
} from '@/components/ui/chart';
import { MaterialIcon } from '@/components/ui/material-icon';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyPoint {
  date: string;
  revenue: number;
  expense: number;
  net: number;
}

interface Props {
  data: Array<DailyPoint>;
  isLoading: boolean;
  mode: 'both' | 'revenue' | 'expense' | 'net';
  title?: string;
}

const CHART_CONFIG: ChartConfig = {
  Revenue: { label: 'Revenue (الإيرادات)', color: 'var(--chart-2)' },
  Expenses: { label: 'Expenses (المصروفات)', color: 'var(--destructive)' },
  Net: { label: 'Net Cash (صافي الدخل)', color: 'var(--chart-1)' },
};

const MODE_KEYS: Record<Props['mode'], Array<string>> = {
  revenue: ['Revenue'],
  expense: ['Expenses'],
  net: ['Net'],
  both: ['Revenue', 'Expenses'],
};

const MODE_COLORS: Record<Props['mode'], Array<string>> = {
  revenue: ['var(--chart-2)'],
  expense: ['var(--destructive)'],
  net: ['var(--chart-1)'],
  both: ['var(--chart-2)', 'var(--destructive)'],
};

const formatPoints = (points: Array<DailyPoint>) =>
  points.map((p) => {
    // Format "YYYY-MM-DD" into short readable label e.g. "Nov 24"
    const parts = p.date.split('-');
    const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : p.date;

    return {
      month: label,
      dateFull: p.date,
      Revenue: Math.round(p.revenue / 100),
      Expenses: Math.round(p.expense / 100),
      Net: Math.round(p.net / 100),
    };
  });

export function FinanceCashFlowChart({ data, isLoading, mode, title }: Props) {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const dataKeys = MODE_KEYS[mode];
  const colors = MODE_COLORS[mode];

  const legendConfig = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        dataKeys.map((k, i) => [
          k,
          {
            label: CHART_CONFIG[k]?.label ?? k,
            color: colors[i] ?? 'var(--muted-foreground)',
          },
        ]),
      ),
    [colors, dataKeys],
  );

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <span className="mb-2 inline-flex text-3xl text-muted-foreground/60">
          <MaterialIcon name="query_stats" />
        </span>
        <p className="font-semibold text-foreground">
          No financial transactions in this period
        </p>
        <p className="mt-1 text-xs">
          Record revenue or expenses to view cash flow trends
        </p>
      </div>
    );
  }

  const transformed = formatPoints(data);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {title !== undefined && title !== '' && (
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
        )}
        <div className="ms-auto flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          <Button
            onClick={() => setChartType('area')}
            size="xs"
            type="button"
            variant={chartType === 'area' ? 'default' : 'ghost'}
          >
            <span className="me-1 inline-flex text-sm">
              <MaterialIcon name="show_chart" />
            </span>
            Area
          </Button>
          <Button
            onClick={() => setChartType('bar')}
            size="xs"
            type="button"
            variant={chartType === 'bar' ? 'default' : 'ghost'}
          >
            <span className="me-1 inline-flex text-sm">
              <MaterialIcon name="bar_chart" />
            </span>
            Bar
          </Button>
        </div>
      </div>

      <ChartContainer config={CHART_CONFIG} height={240}>
        {chartType === 'area' ? (
          <AreaChart
            colors={colors}
            data={transformed}
            dataKeys={dataKeys}
            height={240}
            xAxisKey="month"
          />
        ) : (
          <BarChart
            colors={colors}
            data={transformed}
            dataKeys={dataKeys}
            height={240}
            xAxisKey="month"
          />
        )}
        <ChartLegend config={legendConfig} />
      </ChartContainer>
    </div>
  );
}
