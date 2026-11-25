// apps/web/src/routes/_app/finance.tsx

import type { DatePreset } from '@/hooks/use-finance';

import { createFileRoute, redirect } from '@tanstack/react-router';
import { useMemo } from 'react';

import {
  FinanceAiInsightCard,
  FinanceCashFlowChart,
  FinanceCategoryBreakdown,
  FinanceReceiptDialog,
  FinanceSummaryCards,
  FinanceTransactionDialog,
  FinanceTransactionsTable,
} from '@/components/finance';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/material-icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveClinicId } from '@/hooks/use-active-clinic';
import {
  formatEgp,
  getDateRangeFromPreset,
  useClinicFinance,
} from '@/hooks/use-finance';
import { authClient } from '@/lib/auth-client';
import { useFinanceStore } from '@/lib/web/finance-store';
import { financeSearchSchema } from '@/lib/web/route-search-schemas';
import { routeShell } from '@/lib/web/route-shell';

const PRESET_OPTIONS: Array<{ label: string; value: DatePreset }> = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: 'Year-to-Date', value: 'ytd' },
  { label: 'All Time', value: 'all' },
];

type FinanceTab = 'overview' | 'revenue' | 'expenses' | 'cashflow';

const isFinanceTab = (value: string): value is FinanceTab =>
  value === 'overview' ||
  value === 'revenue' ||
  value === 'expenses' ||
  value === 'cashflow';

const hasText = (value: string | undefined): value is string =>
  value !== undefined && value !== '';

type FinanceHookData = ReturnType<typeof useClinicFinance>;

interface TabSectionProps {
  chartPoints: FinanceHookData['chartPoints'];
  revBreakdown: FinanceHookData['revBreakdown'];
  expBreakdown: FinanceHookData['expBreakdown'];
  entries: FinanceHookData['entries'];
  summary: FinanceHookData['summary'];
  isLoading: boolean;
  dateRange: { from?: Date; to?: Date };
  kindFilter: 'all' | 'revenue' | 'expense';
  onKindFilterChange: (kind: 'all' | 'revenue' | 'expense') => void;
  onOpenRecordModal: (kind: 'revenue' | 'expense') => void;
}

const FinanceOverviewTab = ({
  chartPoints,
  revBreakdown,
  expBreakdown,
  entries,
  isLoading,
  dateRange,
  kindFilter,
  onKindFilterChange,
}: Pick<
  TabSectionProps,
  | 'chartPoints'
  | 'revBreakdown'
  | 'expBreakdown'
  | 'entries'
  | 'isLoading'
  | 'dateRange'
  | 'kindFilter'
  | 'onKindFilterChange'
>) => (
  <div className="mt-6 space-y-6">
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="text-sm font-bold text-foreground">
              Revenue vs. Operating Expense Trajectory
            </span>
          </CardTitle>
          <CardDescription>
            <span className="text-xs text-muted-foreground">
              Daily income generation compared to clinic disbursements
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FinanceCashFlowChart
            data={chartPoints}
            isLoading={isLoading}
            mode="both"
          />
        </CardContent>
      </Card>
    </div>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-chart-2 uppercase">
                <span className="inline-flex">
                  <MaterialIcon name="pie_chart" />
                </span>
                <span>Revenue by Clinical Service (مصادر الإيراد)</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceCategoryBreakdown
              isLoading={isLoading}
              items={revBreakdown}
              kind="revenue"
            />
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-destructive uppercase">
                <span className="inline-flex">
                  <MaterialIcon name="pie_chart" />
                </span>
                <span>Operating Cost Centers (بنود المصروفات)</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceCategoryBreakdown
              isLoading={isLoading}
              items={expBreakdown}
              kind="expense"
            />
          </CardContent>
        </Card>
      </div>
    </div>

    <FinanceAiInsightCard range={dateRange} />

    <div className="space-y-2">
      <h2 className="text-sm font-bold text-foreground">
        Recent Financial Ledger Records
      </h2>
      <FinanceTransactionsTable
        entries={entries}
        isLoading={isLoading}
        kindFilter={kindFilter}
        onKindFilterChange={onKindFilterChange}
      />
    </div>
  </div>
);

const FinanceRevenueTab = ({
  chartPoints,
  revBreakdown,
  entries,
  isLoading,
  onOpenRecordModal,
}: Pick<
  TabSectionProps,
  'chartPoints' | 'revBreakdown' | 'entries' | 'isLoading' | 'onOpenRecordModal'
>) => {
  const revenueEntries = useMemo(
    () => entries.filter((e) => e.kind === 'revenue'),
    [entries],
  );

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card shadow-sm md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="text-sm font-bold text-chart-2">
                  Clinical Revenue Growth &amp; Volume Trend
                </span>
              </CardTitle>
              <CardDescription>
                <span className="text-xs text-muted-foreground">
                  Daily fee collections from consultations, vaccinations, and
                  pediatric procedures
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FinanceCashFlowChart
                data={chartPoints}
                isLoading={isLoading}
                mode="revenue"
              />
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="text-xs font-bold tracking-wider text-chart-2 uppercase">
                  Revenue Distribution
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceCategoryBreakdown
                isLoading={isLoading}
                items={revBreakdown}
                kind="revenue"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-chart-2">
            All Revenue Invoices &amp; Receipts (سجل الإيرادات)
          </h2>
          <Button
            onClick={() => onOpenRecordModal('revenue')}
            size="sm"
            type="button"
          >
            <span className="me-1 inline-flex">
              <MaterialIcon name="add" />
            </span>
            <span>Add Revenue Entry</span>
          </Button>
        </div>
        <FinanceTransactionsTable
          entries={revenueEntries}
          isLoading={isLoading}
          kindFilter="revenue"
        />
      </div>
    </div>
  );
};

const FinanceExpensesTab = ({
  chartPoints,
  expBreakdown,
  entries,
  isLoading,
  onOpenRecordModal,
}: Pick<
  TabSectionProps,
  'chartPoints' | 'expBreakdown' | 'entries' | 'isLoading' | 'onOpenRecordModal'
>) => {
  const expenseEntries = useMemo(
    () => entries.filter((e) => e.kind === 'expense'),
    [entries],
  );

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card shadow-sm md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="text-sm font-bold text-destructive">
                  Clinic Operating Expenditure Trend
                </span>
              </CardTitle>
              <CardDescription>
                <span className="text-xs text-muted-foreground">
                  Medical supplies restock, rent, utilities, and staff
                  compensation
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FinanceCashFlowChart
                data={chartPoints}
                isLoading={isLoading}
                mode="expense"
              />
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="text-xs font-bold tracking-wider text-destructive uppercase">
                  Expenditure Distribution
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceCategoryBreakdown
                isLoading={isLoading}
                items={expBreakdown}
                kind="expense"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-destructive">
            All Operational Disbursements (سجل المصروفات)
          </h2>
          <Button
            onClick={() => onOpenRecordModal('expense')}
            size="sm"
            type="button"
            variant="destructive"
          >
            <span className="me-1 inline-flex">
              <MaterialIcon name="add" />
            </span>
            <span>Add Expense Entry</span>
          </Button>
        </div>
        <FinanceTransactionsTable
          entries={expenseEntries}
          isLoading={isLoading}
          kindFilter="expense"
        />
      </div>
    </div>
  );
};

const FinanceCashflowTab = ({
  chartPoints,
  entries,
  summary,
  isLoading,
  dateRange,
}: Pick<
  TabSectionProps,
  'chartPoints' | 'entries' | 'summary' | 'isLoading' | 'dateRange'
>) => (
  <div className="mt-6 space-y-6">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="rounded-xl border border-border bg-card shadow-sm md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="text-sm font-bold text-foreground">
                Net Cash Margin &amp; Income Velocity
              </span>
            </CardTitle>
            <CardDescription>
              <span className="text-xs text-muted-foreground">
                Net operational surplus (Revenue − Expenses) over selected
                timeframe
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FinanceCashFlowChart
              data={chartPoints}
              isLoading={isLoading}
              mode="net"
            />
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="text-xs font-bold tracking-wider text-foreground uppercase">
                Income Health Summary
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-xl bg-muted p-3 text-center">
                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Net Operational Surplus
                </span>
                <p className="mt-1 font-mono text-2xl font-extrabold text-foreground">
                  {formatEgp(summary?.netBalanceCents)}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Profit Margin:</span>
                  <span className="font-mono font-bold text-chart-2">
                    {summary?.profitMarginPercent ?? 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Total Entries:</span>
                  <span className="font-mono font-bold text-foreground">
                    {summary?.totalCount ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">
                    Revenue Entries:
                  </span>
                  <span className="font-mono font-bold text-chart-2">
                    {summary?.revenueCount ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Expense Entries:
                  </span>
                  <span className="font-mono font-bold text-destructive">
                    {summary?.expenseCount ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <FinanceAiInsightCard range={dateRange} />

    <div className="space-y-2">
      <h2 className="text-sm font-bold text-foreground">
        Complete Chronological Financial Ledger
      </h2>
      <FinanceTransactionsTable
        entries={entries}
        isLoading={isLoading}
        kindFilter="all"
      />
    </div>
  </div>
);

const FinanceComponent = () => {
  const clinicId = useActiveClinicId();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const openRecordModal = useFinanceStore((s) => s.openRecordModal);

  const dateRange = useMemo(() => {
    if (hasText(search.from) || hasText(search.to)) {
      return {
        from: hasText(search.from) ? new Date(search.from) : undefined,
        to: hasText(search.to) ? new Date(search.to) : undefined,
      };
    }

    return getDateRangeFromPreset(search.preset);
  }, [search.from, search.to, search.preset]);

  const {
    entries,
    summary,
    chartPoints,
    revBreakdown,
    expBreakdown,
    isLoading,
  } = useClinicFinance(clinicId, dateRange);

  const handleTabChange = (newTab: string) => {
    if (!isFinanceTab(newTab)) {
      return;
    }

    navigate({
      search: (prev) => ({
        ...prev,
        tab: newTab,
      }),
    }).catch(() => null);
  };

  const handlePresetChange = (preset: DatePreset) => {
    navigate({
      search: (prev) => ({
        ...prev,
        preset,
        from: undefined,
        to: undefined,
      }),
    }).catch(() => null);
  };

  const handleKindChange = (kind: 'all' | 'revenue' | 'expense') => {
    navigate({
      search: (prev) => ({
        ...prev,
        kind,
      }),
    }).catch(() => null);
  };

  const fromDateDisplay =
    dateRange.from === undefined
      ? 'Beginning'
      : dateRange.from.toLocaleDateString('en-GB');

  const toDateDisplay =
    dateRange.to === undefined
      ? 'Present'
      : dateRange.to.toLocaleDateString('en-GB');

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-6 md:px-8">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/15 text-chart-2">
              <span className="inline-flex text-2xl">
                <MaterialIcon name="payments" />
              </span>
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                Clinic Financial Ledger &amp; Cash Flow
              </h1>
              <p className="text-xs text-muted-foreground">
                Pediatric consultation billing, immunization revenue,
                consumables, and operational cash margin (الحسابات والإيرادات)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => openRecordModal('revenue')}
            size="sm"
            type="button"
          >
            <span className="me-1 inline-flex text-base">
              <MaterialIcon name="add" />
            </span>
            <span>Record Revenue (إيراد)</span>
          </Button>
          <Button
            onClick={() => openRecordModal('expense')}
            size="sm"
            type="button"
            variant="destructive"
          >
            <span className="me-1 inline-flex text-base">
              <MaterialIcon name="remove" />
            </span>
            <span>Record Expense (مصروف)</span>
          </Button>
        </div>
      </div>

      {/* Date Preset Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex text-lg text-muted-foreground">
            <MaterialIcon name="date_range" />
          </span>
          <span className="text-xs font-semibold text-foreground">Period:</span>
          <div className="flex flex-wrap items-center gap-1">
            {PRESET_OPTIONS.map((opt) => {
              const isSelected = search.preset === opt.value;

              return (
                <button
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  key={opt.value}
                  onClick={() => handlePresetChange(opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="font-mono text-xs text-muted-foreground">
          {fromDateDisplay} — {toDateDisplay}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <FinanceSummaryCards isLoading={isLoading} summary={summary} />

      {/* Navigation Tabs */}
      <Tabs onValueChange={handleTabChange} value={search.tab}>
        <TabsList>
          <TabsTrigger value="overview">
            <span className="me-1.5 inline-flex text-sm">
              <MaterialIcon name="dashboard" />
            </span>
            <span>Overview (نظرة شاملة)</span>
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <span className="me-1.5 inline-flex text-sm text-chart-2">
              <MaterialIcon name="arrow_upward" />
            </span>
            <span>Revenue (الإيرادات)</span>
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <span className="me-1.5 inline-flex text-sm text-destructive">
              <MaterialIcon name="arrow_downward" />
            </span>
            <span>Expenses (المصروفات)</span>
          </TabsTrigger>
          <TabsTrigger value="cashflow">
            <span className="me-1.5 inline-flex text-sm text-chart-6">
              <MaterialIcon name="account_balance_wallet" />
            </span>
            <span>Cash Flow &amp; Margin (صافي الدخل)</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <FinanceOverviewTab
            chartPoints={chartPoints}
            dateRange={dateRange}
            entries={entries}
            expBreakdown={expBreakdown}
            isLoading={isLoading}
            kindFilter={search.kind}
            onKindFilterChange={handleKindChange}
            revBreakdown={revBreakdown}
          />
        </TabsContent>

        <TabsContent value="revenue">
          <FinanceRevenueTab
            chartPoints={chartPoints}
            entries={entries}
            isLoading={isLoading}
            onOpenRecordModal={openRecordModal}
            revBreakdown={revBreakdown}
          />
        </TabsContent>

        <TabsContent value="expenses">
          <FinanceExpensesTab
            chartPoints={chartPoints}
            entries={entries}
            expBreakdown={expBreakdown}
            isLoading={isLoading}
            onOpenRecordModal={openRecordModal}
          />
        </TabsContent>

        <TabsContent value="cashflow">
          <FinanceCashflowTab
            chartPoints={chartPoints}
            dateRange={dateRange}
            entries={entries}
            isLoading={isLoading}
            summary={summary}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <FinanceTransactionDialog />
      <FinanceReceiptDialog />
    </div>
  );
};

export const Route = createFileRoute('/_app/finance')({
  staticData: routeShell.app,
  validateSearch: financeSearchSchema,
  component: FinanceComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
      throw redirect({ to: '/login' });
    }

    return { session };
  },
});
