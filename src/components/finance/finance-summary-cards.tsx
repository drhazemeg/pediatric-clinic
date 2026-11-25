// apps/web/src/components/finance/FinanceSummaryCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/material-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEgp } from '@/hooks/use-finance';

interface SummaryData {
  totalRevenueCents: number;
  totalExpenseCents: number;
  netBalanceCents: number;
}

interface Props {
  summary: SummaryData | null | undefined;
  isLoading: boolean;
}

const TREND_COLOR_MAP: Record<'up' | 'down' | 'neutral', string> = {
  up: 'text-chart-2',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
};

const TREND_ICON_MAP: Record<'up' | 'down' | 'neutral', string> = {
  up: 'trending_up',
  down: 'trending_down',
  neutral: 'trending_flat',
};

const KpiCard = ({
  label,
  arabic,
  value,
  isLoading,
  colorClass,
  icon,
  trend,
}: {
  label: string;
  arabic: string;
  value: string;
  isLoading: boolean;
  colorClass: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <div className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <span>{label}</span>
              <span className="ms-1 text-muted-foreground/70">({arabic})</span>
            </span>
          </CardTitle>
          <span className={`inline-flex text-xl ${colorClass}`}>
            <MaterialIcon name={icon} />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <p
            className={`font-mono text-3xl font-extrabold tracking-tight ${colorClass}`}
          >
            {value}
          </p>
        )}
        {trend && !isLoading && (
          <p
            className={`mt-1 flex items-center gap-0.5 text-xs ${TREND_COLOR_MAP[trend]}`}
          >
            <span className="inline-flex text-base">
              <MaterialIcon name={TREND_ICON_MAP[trend]} />
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  </div>
);

export const FinanceSummaryCards = ({ summary, isLoading }: Props) => {
  const net = summary?.netBalanceCents ?? 0;

  let netTrend: 'up' | 'down' | 'neutral' = 'neutral';

  if (net > 0) {
    netTrend = 'up';
  } else if (net < 0) {
    netTrend = 'down';
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard
        arabic="إجمالي الإيرادات"
        colorClass="text-chart-2"
        icon="payments"
        isLoading={isLoading}
        label="Total Revenue"
        trend="neutral"
        value={formatEgp(summary?.totalRevenueCents)}
      />
      <KpiCard
        arabic="إجمالي المصروفات"
        colorClass="text-destructive"
        icon="receipt_long"
        isLoading={isLoading}
        label="Total Expenses"
        trend="neutral"
        value={formatEgp(summary?.totalExpenseCents)}
      />
      <KpiCard
        arabic="صافي الدخل"
        colorClass={net >= 0 ? 'text-foreground' : 'text-destructive'}
        icon="account_balance_wallet"
        isLoading={isLoading}
        label="Net Cash Margin"
        trend={netTrend}
        value={formatEgp(summary?.netBalanceCents)}
      />
    </div>
  );
};
