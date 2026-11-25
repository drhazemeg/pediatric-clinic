// apps/web/src/routes/_app/appointments.tsx

import {
	createFileRoute,
	Link,
	redirect,
	useNavigate
} from "@tanstack/react-router";
import { type ChangeEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@/components/ui/table";
import { useActiveClinicId } from "@/hooks/use-active-clinic";
import {
	useCreateAppointment,
	useTodayAppointments,
	useUpdateAppointmentStatus
} from "@/hooks/use-appointments";
import { usePatientList } from "@/hooks/use-patients";
import { useEnqueuePatient } from "@/hooks/use-queue";
import { authClient } from "@/lib/auth-client";
import { appointmentsSearchSchema } from "@/lib/web/route-search-schemas";
import { routeShell } from "@/lib/web/route-shell";

const VISIT_REASONS = [
	"Routine Neonatal Checkup (متابعة حديثي الولادة)",
	"Lactation & Breastfeeding Consultation (استشارة رضاعة طبيعية)",
	"Routine Vaccination (تطعيم دوري)",
	"Acute Illness / Fever (حمى أو مرض حاد)",
	"Growth & Nutrition Assessment (متابعة نمو وتغذية)",
	"Post-Discharge Follow-up (متابعة بعد خروج)"
] as const;

const STATUS_BADGE_STYLES: Record<string, string> = {
	scheduled: "bg-[var(--slushie-500)]/20 text-[var(--slushie-800)]",
	checked_in: "bg-[var(--lemon-500)]/25 text-[var(--lemon-800)]",
	completed: "bg-[var(--matcha-600)]/20 text-[var(--matcha-800)]",
	cancelled: "bg-[var(--pomegranate-400)]/20 text-[var(--pomegranate-600)]",
	"no-show": "bg-[var(--oat-light)] text-[var(--warm-charcoal)]"
};

export const Route = createFileRoute("/_app/appointments")({
	staticData: routeShell.app,
	component: AppointmentsComponent,
	validateSearch: appointmentsSearchSchema,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	}
});

function AppointmentsComponent() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const clinicId = useActiveClinicId();
	const [isBookOpen, setIsBookOpen] = useState(false);

	// Queries
	const { data: appointments, isLoading } = useTodayAppointments(clinicId);
	const { patients } = usePatientList({ clinicId });

	// Mutations
	const { create: createAppointment, isPending: isCreating } =
		useCreateAppointment();
	const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
		useUpdateAppointmentStatus();
	const enqueueMutation = useEnqueuePatient();

	// Booking form state
	const [selectedPatientId, setSelectedPatientId] = useState("");
	const [scheduledAt, setScheduledAt] = useState("");
	const [reason, setReason] = useState("");
	const [durationMinutes, setDurationMinutes] = useState("30");
	const [formError, setFormError] = useState<string | null>(null);
	const [enqueuingPatientId, setEnqueuingPatientId] = useState<string | null>(
		null
	);

	const filteredAppointments = useMemo(() => {
		return (appointments ?? []).filter(apt => {
			if (search.status !== "all" && apt.status !== search.status) {
				return false;
			}
			if (search.date) {
				const aptDate = new Date(apt.scheduledAt).toISOString().split("T")[0];
				if (aptDate !== search.date) return false;
			}
			return true;
		});
	}, [appointments, search.status, search.date]);

	const resetBookingForm = () => {
		setSelectedPatientId("");
		setScheduledAt("");
		setReason("");
		setDurationMinutes("30");
		setFormError(null);
	};

	const handleBookSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
		e.preventDefault();
		setFormError(null);

		if (!selectedPatientId || !scheduledAt) {
			setFormError("Please select a patient and choose a date and time.");
			return;
		}

		const parsedDate = new Date(scheduledAt);
		if (Number.isNaN(parsedDate.getTime())) {
			setFormError("Invalid date or time selected.");
			return;
		}

		const parsedDuration = Number.parseInt(durationMinutes, 10);

		await createAppointment({
			clinicId,
			patientId: selectedPatientId,
			scheduledAt: parsedDate,
			reason: reason.trim() || "Pediatric consultation",
			durationMinutes: Number.isFinite(parsedDuration) ? parsedDuration : 30
		});

		resetBookingForm();
		setIsBookOpen(false);
	};

	const handleSendToQueue = async (
		appointmentId: string,
		patientId: string
	) => {
		setEnqueuingPatientId(patientId);
		try {
			await enqueueMutation.mutateAsync({
				clinicId,
				patientId,
				priority: 0
			});
			await updateStatus({
				id: appointmentId,
				status: "completed"
			});
		} finally {
			setEnqueuingPatientId(null);
		}
	};

	const handleStatusChange = async (
		appointmentId: string,
		nextStatus: "completed" | "cancelled" | "no-show"
	) => {
		await updateStatus({
			id: appointmentId,
			status: nextStatus
		});
	};

	const clearDateFilter = () => {
		navigate({
			search: prev => ({
				...prev,
				date: undefined
			}),
			replace: true
		});
	};

	return (
		<div className='mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8'>
			{/* Header */}
			<div className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
				<div>
					<div className='flex items-center gap-2'>
						<MaterialIcon
							className='text-2xl text-[var(--matcha-600)]'
							name='calendar_month'
						/>
						<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
							Appointment Scheduling (جدول المواعيد)
						</h1>
					</div>
					<p className='mt-1 text-sm text-[var(--warm-charcoal)]/80'>
						Manage pediatric &amp; lactation clinic bookings, routine checks,
						and follow-ups — Dr. Hazem Ali
					</p>
				</div>

				<Dialog
					onOpenChange={open => {
						setIsBookOpen(open);
						if (!open) setFormError(null);
					}}
					open={isBookOpen}
				>
					<DialogTrigger>
						<Button
							className='gap-2 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
							type='button'
						>
							<MaterialIcon name='add_task' />
							<span>Book Appointment</span>
						</Button>
					</DialogTrigger>
					<DialogContent className='bg-[var(--pure-white)]'>
						<DialogHeader>
							<DialogTitle>Book Clinic Appointment</DialogTitle>
							<DialogDescription>
								Schedule a child or lactation visit with the clinic.
							</DialogDescription>
						</DialogHeader>

						<form
							className='space-y-4 py-2'
							onSubmit={handleBookSubmit}
						>
							<div>
								<Label htmlFor='patientSelect'>Select Patient *</Label>
								<Select
									onValueChange={val => val && setSelectedPatientId(val)}
									value={selectedPatientId}
								>
									<SelectTrigger id='patientSelect'>
										<SelectValue placeholder='Select patient chart...' />
									</SelectTrigger>
									<SelectContent className='max-h-56'>
										{patients.map(p => (
											<SelectItem
												key={p.id}
												value={p.id}
											>
												{p.firstName} {p.lastName} (MRN: {p.mrn})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor='dateTime'>Date &amp; Time *</Label>
								<Input
									id='dateTime'
									onChange={e => setScheduledAt(e.target.value)}
									required
									type='datetime-local'
									value={scheduledAt}
								/>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='reasonPreset'>Reason for Visit</Label>
								<Select
									onValueChange={v => v && setReason(v)}
									value={
										VISIT_REASONS.includes(
											reason as (typeof VISIT_REASONS)[number]
										)
											? reason
											: ""
									}
								>
									<SelectTrigger id='reasonPreset'>
										<SelectValue placeholder='Choose common reason or type below' />
									</SelectTrigger>
									<SelectContent>
										{VISIT_REASONS.map(item => (
											<SelectItem
												key={item}
												value={item}
											>
												{item}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Input
									aria-label='Custom reason for visit'
									id='reason'
									onChange={e => setReason(e.target.value)}
									placeholder='Or type custom visit reason...'
									type='text'
									value={reason}
								/>
							</div>

							<div>
								<Label htmlFor='duration'>Duration (Minutes)</Label>
								<Select
									onValueChange={v => v && setDurationMinutes(v)}
									value={durationMinutes}
								>
									<SelectTrigger id='duration'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='15'>
											15 minutes (Quick follow-up)
										</SelectItem>
										<SelectItem value='30'>
											30 minutes (Standard consultation)
										</SelectItem>
										<SelectItem value='45'>
											45 minutes (Detailed assessment)
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{formError && (
								<p className='text-xs font-medium text-[var(--pomegranate-600)]'>
									{formError}
								</p>
							)}

							<DialogFooter>
								<Button
									onClick={() => {
										setIsBookOpen(false);
										setFormError(null);
									}}
									type='button'
									variant='outline'
								>
									Cancel
								</Button>
								<Button
									className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
									disabled={isCreating}
									type='submit'
								>
									{isCreating ? "Booking..." : "Confirm Booking"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{/* Filter Bar */}
			<div className='mb-4 flex flex-wrap items-center gap-3 text-xs text-[var(--warm-charcoal)]'>
				<div className='flex items-center gap-2'>
					<Label htmlFor='statusFilter'>Status:</Label>
					<Select
						onValueChange={v =>
							v &&
							navigate({
								search: prev => ({
									...prev,
									status: v as typeof search.status
								}),
								replace: true
							})
						}
						value={search.status}
					>
						<SelectTrigger
							className='w-40 bg-[var(--pure-white)]'
							id='statusFilter'
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>All</SelectItem>
							<SelectItem value='scheduled'>Scheduled</SelectItem>
							<SelectItem value='checked_in'>Checked In</SelectItem>
							<SelectItem value='completed'>Completed</SelectItem>
							<SelectItem value='cancelled'>Cancelled</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{search.date && (
					<div className='flex items-center gap-1.5 rounded-full border border-[var(--oat-border)] bg-[var(--pure-white)] px-3 py-1'>
						<span>Date filter: {search.date}</span>
						<button
							aria-label='Clear date filter'
							className='cursor-pointer font-bold text-[var(--warm-charcoal)] hover:text-[var(--clay-black)]'
							onClick={clearDateFilter}
							type='button'
						>
							×
						</button>
					</div>
				)}
			</div>

			{/* Appointments Table */}
			<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardHeader>
					<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
						Today&apos;s Appointment Schedule
					</CardTitle>
					<CardDescription>
						All reserved outpatient consults for today (
						{filteredAppointments.length})
					</CardDescription>
				</CardHeader>
				<CardContent className='p-0'>
					{isLoading ? (
						<div className='space-y-3 p-6'>
							<Skeleton className='h-12 w-full' />
							<Skeleton className='h-12 w-full' />
						</div>
					) : filteredAppointments.length === 0 ? (
						<div className='py-12 text-center'>
							<MaterialIcon
								className='text-4xl text-[var(--warm-charcoal)]/40'
								name='event_busy'
							/>
							<p className='mt-2 font-medium text-[var(--warm-charcoal)]'>
								No appointments match the current view
							</p>
							<p className='text-xs text-[var(--warm-charcoal)]/70'>
								Click &ldquo;Book Appointment&rdquo; to schedule an upcoming
								patient visit.
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Time</TableHead>
									<TableHead>Child Name</TableHead>
									<TableHead>MRN</TableHead>
									<TableHead>Reason</TableHead>
									<TableHead>Duration</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className='text-end'>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredAppointments.map(apt => {
									const isRowBusy =
										enqueuingPatientId === apt.patientId || isUpdatingStatus;
									const badgeClass =
										STATUS_BADGE_STYLES[apt.status] ??
										"bg-[var(--oat-light)] text-[var(--clay-black)]";

									return (
										<TableRow key={apt.id}>
											<TableCell className='text-xs font-bold text-[var(--clay-black)]'>
												{new Date(apt.scheduledAt).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit"
												})}
											</TableCell>
											<TableCell>
												<Link
													className='text-sm font-semibold text-[var(--clay-black)] hover:underline'
													params={{ patientId: apt.patientId }}
													to='/patients/$patientId'
												>
													{apt.patient?.firstName} {apt.patient?.lastName}
												</Link>
											</TableCell>
											<TableCell className='font-mono text-xs text-[var(--warm-charcoal)]'>
												{apt.patient?.mrn}
											</TableCell>
											<TableCell className='text-xs text-[var(--warm-charcoal)]'>
												{apt.reason || "Pediatric consultation"}
											</TableCell>
											<TableCell className='text-xs text-[var(--warm-charcoal)]'>
												{apt.durationMinutes} min
											</TableCell>
											<TableCell>
												<span
													className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${badgeClass}`}
												>
													{apt.status}
												</span>
											</TableCell>
											<TableCell className='text-end'>
												<div className='flex items-center justify-end gap-2'>
													<Button
														disabled={isRowBusy || apt.status === "cancelled"}
														onClick={() =>
															handleSendToQueue(apt.id, apt.patientId)
														}
														size='sm'
														title='Check-in & send to waiting room'
														type='button'
														variant='outline'
													>
														<MaterialIcon
															className='mr-1 text-sm'
															name='check'
														/>
														<span>Arrived (Queue)</span>
													</Button>
													{apt.status === "scheduled" && (
														<Button
															disabled={isRowBusy}
															onClick={() =>
																handleStatusChange(apt.id, "cancelled")
															}
															size='sm'
															type='button'
															variant='ghost'
														>
															Cancel
														</Button>
													)}
													<Link
														params={{ patientId: apt.patientId }}
														to='/patients/$patientId'
													>
														<Button
															size='sm'
															type='button'
															variant='ghost'
														>
															Chart
														</Button>
													</Link>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
