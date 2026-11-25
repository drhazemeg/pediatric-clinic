// apps/web/src/routes/_app/dashboard.tsx

import {createFileRoute, Link, redirect} from "@tanstack/react-router";
import {useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {MaterialIcon} from "@/components/ui/MaterialIcon";
import {Skeleton} from "@/components/ui/skeleton";
import {useActiveClinic} from "@/hooks/use-active-clinic";
import {useTodayAppointments} from "@/hooks/use-appointments";
import {useQueueCounts} from "@/hooks/use-clinic-store";
import {useLedgerSummary} from "@/hooks/use-finance";
import {usePatientList} from "@/hooks/use-patients";
import {
    useCallNext,
    useSyncQueueToStore,
    useUpdateQueueStatus
} from "@/hooks/use-queue";
import {authClient} from "@/lib/auth-client";
import {routeShell} from "@/lib/web/route-shell";

export const Route = createFileRoute("/_app/dashboard")({
	staticData: routeShell.app,
	component: DashboardComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	}
});

function DashboardComponent() {
	const { user, clinicId } = useActiveClinic();
	const [activeQueueActionId, setActiveQueueActionId] = useState<string | null>(
		null
	);

	// Clinical Queries & Store Sync
	const { data: queueData, isLoading: isQueueLoading } =
		useSyncQueueToStore(clinicId);
	const { waiting, inVitals, withDoctor } = useQueueCounts();
	const activeQueueCount = waiting + inVitals;
	const counts = useQueueCounts();
	const { data: todayAppointments, isLoading: isAppointmentsLoading } =
		useTodayAppointments(clinicId);
	const { total: totalPatients, isLoading: isPatientsLoading } = usePatientList(
		{ clinicId }
	);
	const { data: ledgerSummary, isLoading: isFinanceLoading } =
		useLedgerSummary(clinicId);

	// Mutations
	const callNextMutation = useCallNext();
	const updateStatusMutation = useUpdateQueueStatus();

	// Derived metrics from TanStack Store counts
	const activeWaitingCount = counts.waiting + counts.inVitals;

	const todayDateString = useMemo(() => {
		return new Intl.DateTimeFormat("en-US", {
			weekday: "long",
			year: "numeric",
			month: "short",
			day: "numeric"
		}).format(new Date());
	}, []);

	const handleCallNext = async () => {
		await callNextMutation.mutateAsync({ clinicId });
	};

	const handleQueueStatusUpdate = async (
		id: string,
		status: "IN_VITALS" | "WITH_DOCTOR"
	) => {
		setActiveQueueActionId(id);
		try {
			await updateStatusMutation.mutateAsync({ id, status });
		} finally {
			setActiveQueueActionId(null);
		}
	};

	const formatCurrency = (cents: number) => {
		return new Intl.NumberFormat("en-EG", {
			style: "currency",
			currency: "EGP",
			maximumFractionDigits: 0
		}).format(cents / 100);
	};

	return (
		<div className='mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8'>
			{/* Header Greeting Banner */}
			<div className='mb-8 flex flex-col justify-between gap-4 rounded-[var(--radius-xl)] border border-[var(--oat-border)] bg-[var(--pure-white)] p-6 shadow-sm sm:flex-row sm:items-center'>
				<div>
					<div className='flex items-center gap-2'>
						<MaterialIcon
							className='text-2xl text-[var(--matcha-600)]'
							name='local_hospital'
						/>
						<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
							Pediatric &amp; Lactation Clinic — Hurghada
						</h1>
					</div>
					<p className='mt-1 text-sm text-[var(--warm-charcoal)]/80'>
						{todayDateString} &bull; Dr. Hazem Ali, MD, IBCLC &bull; Welcome,{" "}
						<span className='font-semibold text-[var(--clay-black)]'>
							{user?.name || "Dr. Hazem Ali"}
						</span>{" "}
						({user?.role ? user.role.toUpperCase() : "CLINICIAN"})
					</p>
				</div>
				<div className='flex flex-wrap items-center gap-3'>
					<Link to='/queue'>
						<Button
							className='gap-2 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
							type='button'
						>
							<MaterialIcon name='person_check' />
							<span>Live Waiting Room</span>
						</Button>
					</Link>
					<Link to='/patients'>
						<Button
							className='gap-2'
							type='button'
							variant='outline'
						>
							<MaterialIcon name='person_add' />
							<span>Register Patient</span>
						</Button>
					</Link>
				</div>
			</div>

			{/* 4 Clinical KPI Cards */}
			<div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				{/* 1. Waiting Room */}
				<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between pb-2'>
						<CardTitle className='text-xs font-semibold tracking-wider text-[var(--warm-charcoal)]/70 uppercase'>
							Active Queue (الانتظار)
						</CardTitle>
						<span className='flex h-8 w-8 items-center justify-center rounded-full bg-[var(--matcha-100)] text-[var(--matcha-700)]'>
							<MaterialIcon name='groups' />
						</span>
					</CardHeader>
					<CardContent>
						{isQueueLoading ? (
							<Skeleton className='h-8 w-16' />
						) : (
							<div className='flex items-baseline gap-2'>
								<span className='font-headline text-3xl font-extrabold text-[var(--clay-black)]'>
									{activeQueueCount}
								</span>
								<span className='text-xs text-[var(--warm-charcoal)]'>
									waiting &bull; {withDoctor} with doctor
								</span>
							</div>
						)}
					</CardContent>
				</Card>

				{/* 2. Today's Appointments */}
				<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between pb-2'>
						<CardTitle className='text-xs font-semibold tracking-wider text-[var(--warm-charcoal)]/70 uppercase'>
							Today&apos;s Visits (المواعيد)
						</CardTitle>
						<span className='flex h-8 w-8 items-center justify-center rounded-full bg-[var(--oat-light)] text-[var(--clay-black)]'>
							<MaterialIcon name='calendar_month' />
						</span>
					</CardHeader>
					<CardContent>
						{isAppointmentsLoading ? (
							<Skeleton className='h-8 w-16' />
						) : (
							<div className='flex items-baseline gap-2'>
								<span className='font-headline text-3xl font-extrabold text-[var(--clay-black)]'>
									{todayAppointments?.length ?? 0}
								</span>
								<span className='text-xs text-[var(--warm-charcoal)]'>
									scheduled visits
								</span>
							</div>
						)}
					</CardContent>
				</Card>

				{/* 3. Total Registered Patients */}
				<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between pb-2'>
						<CardTitle className='text-xs font-semibold tracking-wider text-[var(--warm-charcoal)]/70 uppercase'>
							Directory (سجل الأطفال)
						</CardTitle>
						<span className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600'>
							<MaterialIcon name='child_care' />
						</span>
					</CardHeader>
					<CardContent>
						{isPatientsLoading ? (
							<Skeleton className='h-8 w-16' />
						) : (
							<div className='flex items-baseline gap-2'>
								<span className='font-headline text-3xl font-extrabold text-[var(--clay-black)]'>
									{totalPatients}
								</span>
								<span className='text-xs text-[var(--warm-charcoal)]'>
									pediatric charts
								</span>
							</div>
						)}
					</CardContent>
				</Card>

				{/* 4. Financial Summary */}
				<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] transition-all hover:shadow-md'>
					<CardHeader className='flex flex-row items-center justify-between pb-2'>
						<CardTitle className='text-xs font-semibold tracking-wider text-[var(--warm-charcoal)]/70 uppercase'>
							Daily Revenue (الإيراد)
						</CardTitle>
						<span className='flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'>
							<MaterialIcon name='payments' />
						</span>
					</CardHeader>
					<CardContent>
						{isFinanceLoading ? (
							<Skeleton className='h-8 w-20' />
						) : (
							<div className='flex items-baseline gap-2'>
								<span className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
									{formatCurrency(ledgerSummary?.totalRevenueCents ?? 0)}
								</span>
								<span className='text-xs text-[var(--warm-charcoal)]'>
									net: {formatCurrency(ledgerSummary?.netBalanceCents ?? 0)}
								</span>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Main Grid: Waiting Room + Schedule & Clinical Tools */}
			<div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
				{/* 2 Cols: Live Waiting Room & Appointments */}
				<div className='space-y-6 lg:col-span-2'>
					{/* Waiting Room Card */}
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader className='flex flex-row items-center justify-between'>
							<div>
								<CardTitle className='flex items-center gap-2 text-lg font-bold text-[var(--clay-black)]'>
									<MaterialIcon
										className='text-[var(--matcha-600)]'
										name='hourglass_top'
									/>
									<span>Waiting Room &amp; Triage (صالة الانتظار)</span>
								</CardTitle>
								<CardDescription>
									Live queue order for vitals assessment and physician
									consultation
								</CardDescription>
							</div>
							<div className='flex items-center gap-2'>
								<Button
									className='gap-1 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
									disabled={
										activeWaitingCount === 0 || callNextMutation.isPending
									}
									onClick={handleCallNext}
									size='sm'
									type='button'
								>
									<MaterialIcon name='notifications_active' />
									<span>Call Next</span>
								</Button>
								<Link to='/queue'>
									<Button
										size='sm'
										type='button'
										variant='outline'
									>
										Manage
									</Button>
								</Link>
							</div>
						</CardHeader>
						<CardContent>
							{isQueueLoading ? (
								<div className='space-y-3'>
									<Skeleton className='h-12 w-full' />
									<Skeleton className='h-12 w-full' />
								</div>
							) : (queueData ?? []).length === 0 ? (
								<div className='flex flex-col items-center justify-center py-8 text-center'>
									<MaterialIcon
										className='text-4xl text-[var(--warm-charcoal)]/40'
										name='airline_seat_recline_normal'
									/>
									<p className='mt-2 font-medium text-[var(--warm-charcoal)]'>
										Waiting room is currently empty
									</p>
									<p className='text-xs text-[var(--warm-charcoal)]/70'>
										Patients enqueued at reception or walk-in will appear here.
									</p>
									<Link
										className='mt-4'
										to='/queue'
									>
										<Button
											size='sm'
											type='button'
											variant='outline'
										>
											Enqueue Walk-in Patient
										</Button>
									</Link>
								</div>
							) : (
								<div className='divide-y divide-[var(--oat-border)]'>
									{(queueData ?? []).map((entry, idx) => {
										const isRowUpdating = activeQueueActionId === entry.id;
										const statusBadgeClass =
											entry.status === "WAITING"
												? "bg-amber-100 text-amber-800"
												: entry.status === "IN_VITALS"
													? "bg-blue-100 text-blue-800"
													: entry.status === "WITH_DOCTOR"
														? "bg-emerald-100 text-emerald-800"
														: "bg-gray-100 text-gray-800";

										return (
											<div
												className='flex items-center justify-between py-3'
												key={entry.id}
											>
												<div className='flex items-center gap-3'>
													<span className='flex h-7 w-7 items-center justify-center rounded-full bg-[var(--oat-light)] text-xs font-bold text-[var(--clay-black)]'>
														#{idx + 1}
													</span>
													<div>
														<Link
															className='font-semibold text-[var(--clay-black)] hover:underline'
															params={{ patientId: entry.patientId }}
															to='/patients/$patientId'
														>
															{entry.patient?.firstName}{" "}
															{entry.patient?.lastName}
														</Link>
														<div className='flex items-center gap-2 text-xs text-[var(--warm-charcoal)]/80'>
															<span>MRN: {entry.patient?.mrn}</span>
															<span>&bull;</span>
															<span>
																Priority:{" "}
																<strong className='capitalize'>
																	{entry.priority}
																</strong>
															</span>
														</div>
													</div>
												</div>
												<div className='flex items-center gap-2'>
													<span
														className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${statusBadgeClass}`}
													>
														{entry.status.replace("_", " ")}
													</span>
													{entry.status === "WAITING" && (
														<Button
															disabled={isRowUpdating}
															onClick={() =>
																handleQueueStatusUpdate(entry.id, "IN_VITALS")
															}
															size='sm'
															type='button'
															variant='outline'
														>
															Vitals
														</Button>
													)}
													{entry.status === "IN_VITALS" && (
														<Button
															className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
															disabled={isRowUpdating}
															onClick={() =>
																handleQueueStatusUpdate(entry.id, "WITH_DOCTOR")
															}
															size='sm'
															type='button'
														>
															Start Visit
														</Button>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Today's Appointments Schedule */}
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader className='flex flex-row items-center justify-between'>
							<div>
								<CardTitle className='flex items-center gap-2 text-lg font-bold text-[var(--clay-black)]'>
									<MaterialIcon
										className='text-[var(--matcha-600)]'
										name='calendar_today'
									/>
									<span>Today&apos;s Booked Schedule</span>
								</CardTitle>
								<CardDescription>
									Appointments reserved for outpatient visits today
								</CardDescription>
							</div>
							<Link to='/appointments'>
								<Button
									size='sm'
									type='button'
									variant='outline'
								>
									View All Schedule
								</Button>
							</Link>
						</CardHeader>
						<CardContent>
							{isAppointmentsLoading ? (
								<div className='space-y-3'>
									<Skeleton className='h-10 w-full' />
									<Skeleton className='h-10 w-full' />
								</div>
							) : (todayAppointments ?? []).length === 0 ? (
								<div className='py-6 text-center text-sm text-[var(--warm-charcoal)]/80'>
									No scheduled appointments for today yet.
								</div>
							) : (
								<div className='divide-y divide-[var(--oat-border)]'>
									{(todayAppointments ?? []).slice(0, 5).map(apt => (
										<div
											className='flex items-center justify-between py-2.5'
											key={apt.id}
										>
											<div>
												<p className='font-semibold text-[var(--clay-black)]'>
													{apt.patient?.firstName} {apt.patient?.lastName}
												</p>
												<p className='text-xs text-[var(--warm-charcoal)]/80'>
													{new Date(apt.scheduledAt).toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit"
													})}{" "}
													&bull; {apt.reason || "Routine Checkup"}
												</p>
											</div>
											<span className='rounded-full bg-[var(--oat-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--clay-black)] uppercase'>
												{apt.status}
											</span>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* 1 Col: Quick Clinical Access & Guidance */}
				<div className='space-y-6'>
					{/* Clinical Tools Fast Access */}
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader>
							<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
								Clinical Decision Tools
							</CardTitle>
							<CardDescription>
								Pediatric calculators, lactation notes &amp; guidelines
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-3'>
							<Link
								className='flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--oat-border)] p-3 transition-colors hover:bg-[var(--oat-light)]'
								to='/prescriptions'
							>
								<div className='flex items-center gap-3'>
									<span className='flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600'>
										<MaterialIcon name='medication' />
									</span>
									<div>
										<p className='text-sm font-semibold text-[var(--clay-black)]'>
											Formulary &amp; Dosing
										</p>
										<p className='text-xs text-[var(--warm-charcoal)]/70'>
											EDA dosing &amp; mg/kg weight safety
										</p>
									</div>
								</div>
								<MaterialIcon
									className='text-[var(--warm-charcoal)]/60'
									name='chevron_right'
								/>
							</Link>

							<Link
								className='flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--oat-border)] p-3 transition-colors hover:bg-[var(--oat-light)]'
								to='/growth'
							>
								<div className='flex items-center gap-3'>
									<span className='flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600'>
										<MaterialIcon name='monitoring' />
									</span>
									<div>
										<p className='text-sm font-semibold text-[var(--clay-black)]'>
											Growth Curves (WHO / Egypt LMS)
										</p>
										<p className='text-xs text-[var(--warm-charcoal)]/70'>
											Z-scores and percentiles
										</p>
									</div>
								</div>
								<MaterialIcon
									className='text-[var(--warm-charcoal)]/60'
									name='chevron_right'
								/>
							</Link>

							<Link
								className='flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--oat-border)] p-3 transition-colors hover:bg-[var(--oat-light)]'
								to='/immunizations'
							>
								<div className='flex items-center gap-3'>
									<span className='flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600'>
										<MaterialIcon name='vaccines' />
									</span>
									<div>
										<p className='text-sm font-semibold text-[var(--clay-black)]'>
											Vaccination Matrix
										</p>
										<p className='text-xs text-[var(--warm-charcoal)]/70'>
											Egyptian MOH routine schedule
										</p>
									</div>
								</div>
								<MaterialIcon
									className='text-[var(--warm-charcoal)]/60'
									name='chevron_right'
								/>
							</Link>

							<Link
								className='flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--oat-border)] p-3 transition-colors hover:bg-[var(--oat-light)]'
								to='/jobs'
							>
								<div className='flex items-center gap-3'>
									<span className='flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600'>
										<MaterialIcon name='psychology' />
									</span>
									<div>
										<p className='text-sm font-semibold text-[var(--clay-black)]'>
											AI &amp; Task Monitor
										</p>
										<p className='text-xs text-[var(--warm-charcoal)]/70'>
											Clinical notes &amp; lactation education jobs
										</p>
									</div>
								</div>
								<MaterialIcon
									className='text-[var(--warm-charcoal)]/60'
									name='chevron_right'
								/>
							</Link>
						</CardContent>
					</Card>

					{/* Emergency / Safety Banner */}
					<div className='rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900'>
						<div className='mb-1 flex items-center gap-2 font-bold text-amber-950'>
							<MaterialIcon
								className='text-amber-600'
								name='warning'
							/>
							<span>Pediatric &amp; Lactation Safety Note</span>
						</div>
						Always verify neonatal gestational age, birth weight, and current
						weight in kilograms before confirming drug calculations, lactation
						supplementation plans, or vaccine administration.
					</div>
				</div>
			</div>
		</div>
	);
}
