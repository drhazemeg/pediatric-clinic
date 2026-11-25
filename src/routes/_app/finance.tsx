// apps/web/src/routes/_app/finance.tsx

import {createFileRoute, redirect} from "@tanstack/react-router";
import {useMemo} from "react";
import {
    FinanceAiInsightCard,
    FinanceCashFlowChart,
    FinanceCategoryBreakdown,
    FinanceReceiptDialog,
    FinanceSummaryCards,
    FinanceTransactionDialog,
    FinanceTransactionsTable
} from "@/components/finance";
import {Button} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {MaterialIcon} from "@/components/ui/MaterialIcon";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {useActiveClinicId} from "@/hooks/use-active-clinic";
import {
    type DatePreset,
    formatEgp,
    getDateRangeFromPreset,
    useClinicFinance
} from "@/hooks/use-finance";
import {authClient} from "@/lib/auth-client";
import {financeSearchSchema} from "@/lib/web/route-search-schemas";
import {routeShell} from "@/lib/web/route-shell";
import {useFinanceStore} from "@/lib/web/finance-store";

export const Route = createFileRoute("/_app/finance")({
	staticData: routeShell.app,
	validateSearch: financeSearchSchema,
	component: FinanceComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	}
});

const PRESET_OPTIONS: { label: string; value: DatePreset }[] = [
	{ label: "7 Days", value: "7d" },
	{ label: "30 Days", value: "30d" },
	{ label: "90 Days", value: "90d" },
	{ label: "Year-to-Date", value: "ytd" },
	{ label: "All Time", value: "all" }
];

function FinanceComponent() {
	const clinicId = useActiveClinicId();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	const openRecordModal = useFinanceStore(s => s.openRecordModal);

	// Date range computed from search params or preset
	const dateRange = useMemo(() => {
		if (search.from || search.to) {
			return {
				from: search.from ? new Date(search.from) : undefined,
				to: search.to ? new Date(search.to) : undefined
			};
		}
		return getDateRangeFromPreset(search.preset as DatePreset);
	}, [search.from, search.to, search.preset]);

	// Primary finance data hook
	const {
		entries,
		summary,
		chartPoints,
		revBreakdown,
		expBreakdown,
		isLoading
	} = useClinicFinance(clinicId, dateRange);

	const handleTabChange = (newTab: string) => {
		void navigate({
			search: prev => ({
				...prev,
				tab: newTab as "overview" | "revenue" | "expenses" | "cashflow"
			})
		});
	};

	const handlePresetChange = (preset: DatePreset) => {
		void navigate({
			search: prev => ({
				...prev,
				preset,
				from: undefined,
				to: undefined
			})
		});
	};

	const handleKindChange = (kind: "all" | "revenue" | "expense") => {
		void navigate({
			search: prev => ({
				...prev,
				kind
			})
		});
	};

	return (
		<div className='mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-6 md:px-8'>
			{/* Top Header */}
			<div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
				<div>
					<div className='flex items-center gap-2.5'>
						<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800'>
							<MaterialIcon
								className='text-2xl'
								name='payments'
							/>
						</div>
						<div>
							<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
								Clinic Financial Ledger & Cash Flow
							</h1>
							<p className='text-xs text-[var(--warm-charcoal)]/80'>
								Pediatric consultation billing, immunization revenue,
								consumables, and operational cash margin (الحسابات والإيرادات)
							</p>
						</div>
					</div>
				</div>

				{/* Quick Action Buttons */}
				<div className='flex items-center gap-2'>
					<Button
						className='gap-1.5 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
						onClick={() => openRecordModal("revenue")}
						size='sm'
						type='button'
					>
						<MaterialIcon
							className='text-base'
							name='add'
						/>
						<span>Record Revenue (إيراد)</span>
					</Button>
					<Button
						className='gap-1.5 bg-red-600 text-white shadow-sm hover:bg-red-700'
						onClick={() => openRecordModal("expense")}
						size='sm'
						type='button'
					>
						<MaterialIcon
							className='text-base'
							name='remove'
						/>
						<span>Record Expense (مصروف)</span>
					</Button>
				</div>
			</div>

			{/* Date Preset Filter Bar */}
			<div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--oat-border)] bg-[var(--pure-white)] p-2.5 shadow-sm'>
				<div className='flex items-center gap-2'>
					<MaterialIcon
						className='text-lg text-[var(--warm-charcoal)]'
						name='date_range'
					/>
					<span className='text-xs font-semibold text-[var(--clay-black)]'>
						Period:
					</span>
					<div className='flex flex-wrap items-center gap-1'>
						{PRESET_OPTIONS.map(opt => {
							const isSelected = search.preset === opt.value;
							return (
								<button
									className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
										isSelected
											? "bg-[var(--matcha-600)] text-white shadow-xs"
											: "text-[var(--warm-charcoal)] hover:bg-[var(--oat-border)]/40 hover:text-[var(--clay-black)]"
									}`}
									key={opt.value}
									onClick={() => handlePresetChange(opt.value)}
									type='button'
								>
									{opt.label}
								</button>
							);
						})}
					</div>
				</div>

				<div className='font-mono text-xs text-[var(--warm-charcoal)]/80'>
					{dateRange.from
						? dateRange.from.toLocaleDateString("en-GB")
						: "Beginning"}{" "}
					—{" "}
					{dateRange.to ? dateRange.to.toLocaleDateString("en-GB") : "Present"}
				</div>
			</div>

			{/* KPI Summary Cards */}
			<FinanceSummaryCards
				isLoading={isLoading}
				summary={summary}
			/>

			{/* Navigation Tabs (Overview, Revenue, Expenses, Cash Flow) */}
			<Tabs
				className='w-full space-y-6'
				onValueChange={handleTabChange}
				value={search.tab}
			>
				<TabsList className='rounded-xl border border-[var(--oat-border)] bg-[var(--pure-white)] p-1 shadow-sm'>
					<TabsTrigger
						className='gap-1.5 rounded-lg text-xs font-semibold data-active:bg-[var(--matcha-50)] data-active:text-[var(--matcha-800)]'
						value='overview'
					>
						<MaterialIcon
							className='text-sm'
							name='dashboard'
						/>
						<span>Overview (نظرة شاملة)</span>
					</TabsTrigger>
					<TabsTrigger
						className='gap-1.5 rounded-lg text-xs font-semibold data-active:bg-emerald-50 data-active:text-emerald-800'
						value='revenue'
					>
						<MaterialIcon
							className='text-sm text-emerald-600'
							name='arrow_upward'
						/>
						<span>Revenue (الإيرادات)</span>
					</TabsTrigger>
					<TabsTrigger
						className='gap-1.5 rounded-lg text-xs font-semibold data-active:bg-red-50 data-active:text-red-800'
						value='expenses'
					>
						<MaterialIcon
							className='text-sm text-red-600'
							name='arrow_downward'
						/>
						<span>Expenses (المصروفات)</span>
					</TabsTrigger>
					<TabsTrigger
						className='gap-1.5 rounded-lg text-xs font-semibold data-active:bg-blue-50 data-active:text-blue-800'
						value='cashflow'
					>
						<MaterialIcon
							className='text-sm text-blue-600'
							name='account_balance_wallet'
						/>
						<span>Cash Flow & Margin (صافي الدخل)</span>
					</TabsTrigger>
				</TabsList>

				{/* ── TAB 1: OVERVIEW ── */}
				<TabsContent
					className='space-y-6 outline-none'
					value='overview'
				>
					{/* Cash Flow Trend Chart */}
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
						<CardHeader className='pb-2'>
							<div className='flex items-center justify-between'>
								<div>
									<CardTitle className='text-sm font-bold text-[var(--clay-black)]'>
										Revenue vs. Operating Expense Trajectory
									</CardTitle>
									<CardDescription className='text-xs text-[var(--warm-charcoal)]/80'>
										Daily income generation compared to clinic disbursements
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<FinanceCashFlowChart
								data={chartPoints}
								isLoading={isLoading}
								mode='both'
							/>
						</CardContent>
					</Card>

					{/* Category Breakdowns: Revenue vs Expenses */}
					<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
						<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
							<CardHeader className='pb-3'>
								<CardTitle className='flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-800 uppercase'>
									<MaterialIcon
										className='text-emerald-600'
										name='pie_chart'
									/>
									Revenue by Clinical Service (مصادر الإيراد)
								</CardTitle>
							</CardHeader>
							<CardContent>
								<FinanceCategoryBreakdown
									isLoading={isLoading}
									items={revBreakdown}
									kind='revenue'
								/>
							</CardContent>
						</Card>

						<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
							<CardHeader className='pb-3'>
								<CardTitle className='flex items-center gap-1.5 text-xs font-bold tracking-wider text-red-700 uppercase'>
									<MaterialIcon
										className='text-red-600'
										name='pie_chart'
									/>
									Operating Cost Centers (بنود المصروفات)
								</CardTitle>
							</CardHeader>
							<CardContent>
								<FinanceCategoryBreakdown
									isLoading={isLoading}
									items={expBreakdown}
									kind='expense'
								/>
							</CardContent>
						</Card>
					</div>

					{/* AI Financial Health & Advisory */}
					<FinanceAiInsightCard range={dateRange} />

					{/* Recent Transactions Table */}
					<div className='space-y-2'>
						<h2 className='text-sm font-bold text-[var(--clay-black)]'>
							Recent Financial Ledger Records
						</h2>
						<FinanceTransactionsTable
							entries={entries}
							isLoading={isLoading}
							kindFilter={search.kind}
							onKindFilterChange={handleKindChange}
						/>
					</div>
				</TabsContent>

				{/* ── TAB 2: REVENUE ── */}
				<TabsContent
					className='space-y-6 outline-none'
					value='revenue'
				>
					<div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
						<div className='md:col-span-2'>
							<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
								<CardHeader className='pb-2'>
									<CardTitle className='text-sm font-bold text-emerald-800'>
										Clinical Revenue Growth & Volume Trend
									</CardTitle>
									<CardDescription className='text-xs text-[var(--warm-charcoal)]/80'>
										Daily fee collections from consultations, vaccinations, and
										pediatric procedures
									</CardDescription>
								</CardHeader>
								<CardContent>
									<FinanceCashFlowChart
										data={chartPoints}
										isLoading={isLoading}
										mode='revenue'
									/>
								</CardContent>
							</Card>
						</div>

						<div>
							<Card className='h-full border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
								<CardHeader className='pb-3'>
									<CardTitle className='text-xs font-bold tracking-wider text-emerald-800 uppercase'>
										Revenue Distribution
									</CardTitle>
								</CardHeader>
								<CardContent>
									<FinanceCategoryBreakdown
										isLoading={isLoading}
										items={revBreakdown}
										kind='revenue'
									/>
								</CardContent>
							</Card>
						</div>
					</div>

					{/* Revenue Transactions Table */}
					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<h2 className='text-sm font-bold text-emerald-800'>
								All Revenue Invoices & Receipts (سجل الإيرادات)
							</h2>
							<Button
								className='bg-emerald-600 text-white hover:bg-emerald-700'
								onClick={() => openRecordModal("revenue")}
								size='sm'
								type='button'
							>
								<MaterialIcon
									className='me-1'
									name='add'
								/>
								Add Revenue Entry
							</Button>
						</div>
						<FinanceTransactionsTable
							entries={entries.filter(e => e.kind === "revenue")}
							isLoading={isLoading}
							kindFilter='revenue'
						/>
					</div>
				</TabsContent>

				{/* ── TAB 3: EXPENSES ── */}
				<TabsContent
					className='space-y-6 outline-none'
					value='expenses'
				>
					<div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
						<div className='md:col-span-2'>
							<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
								<CardHeader className='pb-2'>
									<CardTitle className='text-sm font-bold text-red-700'>
										Clinic Operating Expenditure Trend
									</CardTitle>
									<CardDescription className='text-xs text-[var(--warm-charcoal)]/80'>
										Medical supplies restock, rent, utilities, and staff
										compensation
									</CardDescription>
								</CardHeader>
								<CardContent>
									<FinanceCashFlowChart
										data={chartPoints}
										isLoading={isLoading}
										mode='expense'
									/>
								</CardContent>
							</Card>
						</div>

						<div>
							<Card className='h-full border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
								<CardHeader className='pb-3'>
									<CardTitle className='text-xs font-bold tracking-wider text-red-700 uppercase'>
										Expenditure Distribution
									</CardTitle>
								</CardHeader>
								<CardContent>
									<FinanceCategoryBreakdown
										isLoading={isLoading}
										items={expBreakdown}
										kind='expense'
									/>
								</CardContent>
							</Card>
						</div>
					</div>

					{/* Expense Transactions Table */}
					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<h2 className='text-sm font-bold text-red-700'>
								All Operational Disbursements (سجل المصروفات)
							</h2>
							<Button
								className='bg-red-600 text-white hover:bg-red-700'
								onClick={() => openRecordModal("expense")}
								size='sm'
								type='button'
							>
								<MaterialIcon
									className='me-1'
									name='add'
								/>
								Add Expense Entry
							</Button>
						</div>
						<FinanceTransactionsTable
							entries={entries.filter(e => e.kind === "expense")}
							isLoading={isLoading}
							kindFilter='expense'
						/>
					</div>
				</TabsContent>

				{/* ── TAB 4: CASH FLOW & INCOME ── */}
				<TabsContent
					className='space-y-6 outline-none'
					value='cashflow'
				>
					<div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
						<div className='md:col-span-2'>
							<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
								<CardHeader className='pb-2'>
									<CardTitle className='text-sm font-bold text-[var(--clay-black)]'>
										Net Cash Margin & Income Velocity
									</CardTitle>
									<CardDescription className='text-xs text-[var(--warm-charcoal)]/80'>
										Net operational surplus (Revenue − Expenses) over selected
										timeframe
									</CardDescription>
								</CardHeader>
								<CardContent>
									<FinanceCashFlowChart
										data={chartPoints}
										isLoading={isLoading}
										mode='net'
									/>
								</CardContent>
							</Card>
						</div>

						<div>
							<Card className='h-full border-[var(--oat-border)] bg-[var(--pure-white)] shadow-sm'>
								<CardHeader className='pb-3'>
									<CardTitle className='text-xs font-bold tracking-wider text-[var(--clay-black)] uppercase'>
										Income Health Summary
									</CardTitle>
								</CardHeader>
								<CardContent className='space-y-4'>
									<div className='rounded-xl bg-[var(--oat-border)]/20 p-3 text-center'>
										<span className='text-[10px] font-bold tracking-wider text-[var(--warm-charcoal)] uppercase'>
											Net Operational Surplus
										</span>
										<p className='mt-1 font-mono text-2xl font-extrabold text-[var(--clay-black)]'>
											{formatEgp(summary?.netBalanceCents)}
										</p>
									</div>

									<div className='space-y-2 text-xs'>
										<div className='flex items-center justify-between border-b border-[var(--oat-border)]/50 pb-1.5'>
											<span className='text-[var(--warm-charcoal)]'>
												Profit Margin:
											</span>
											<span className='font-mono font-bold text-emerald-700'>
												{summary?.profitMarginPercent ?? 0}%
											</span>
										</div>
										<div className='flex items-center justify-between border-b border-[var(--oat-border)]/50 pb-1.5'>
											<span className='text-[var(--warm-charcoal)]'>
												Total Entries:
											</span>
											<span className='font-mono font-bold text-[var(--clay-black)]'>
												{summary?.totalCount ?? 0}
											</span>
										</div>
										<div className='flex items-center justify-between border-b border-[var(--oat-border)]/50 pb-1.5'>
											<span className='text-[var(--warm-charcoal)]'>
												Revenue Entries:
											</span>
											<span className='font-mono font-bold text-emerald-700'>
												{summary?.revenueCount ?? 0}
											</span>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-[var(--warm-charcoal)]'>
												Expense Entries:
											</span>
											<span className='font-mono font-bold text-red-600'>
												{summary?.expenseCount ?? 0}
											</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					{/* AI Health Advisory in Cash Flow tab */}
					<FinanceAiInsightCard range={dateRange} />

					{/* Chronological Ledger */}
					<div className='space-y-2'>
						<h2 className='text-sm font-bold text-[var(--clay-black)]'>
							Complete Chronological Financial Ledger
						</h2>
						<FinanceTransactionsTable
							entries={entries}
							isLoading={isLoading}
							kindFilter='all'
						/>
					</div>
				</TabsContent>
			</Tabs>

			{/* Dialogs */}
			<FinanceTransactionDialog />
			<FinanceReceiptDialog />
		</div>
	);
}
