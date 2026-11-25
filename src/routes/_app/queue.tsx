// apps/web/src/routes/queue.tsx

import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "@/components/ui/dialog";
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
import { useActiveClinic } from "@/hooks/use-active-clinic";
import { usePatientList } from "@/hooks/use-patients";
import {
	useCallNext,
	useEnqueuePatient,
	useQueueToday,
	useUpdateQueueStatus
} from "@/hooks/use-queue";
import { authClient } from "@/lib/auth-client";
import { routeShell } from "@/lib/web/route-shell";

export const Route = createFileRoute("/_app/queue")({
	staticData: routeShell.app,
	component: QueueComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	}
});

type FilterStatus =
	| "all"
	| "WAITING"
	| "IN_VITALS"
	| "WITH_DOCTOR"
	| "COMPLETED";

function QueueComponent() {
	const { user, clinicId } = useActiveClinic();
	const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
	const [isEnqueueOpen, setIsEnqueueOpen] = useState(false);

	// Enqueue dialog form state
	const [selectedPatientId, setSelectedPatientId] = useState("");
	const [priority, setPriority] = useState<"normal" | "priority" | "urgent">(
		"normal"
	);

	// Queries & mutations
	const { data: queueData, isLoading: isQueueLoading } =
		useQueueToday(clinicId);
	const { patients } = usePatientList({ clinicId });

	const enqueueMutation = useEnqueuePatient();
	const updateStatusMutation = useUpdateQueueStatus();
	const callNextMutation = useCallNext();

	const filteredQueue = useMemo(() => {
		const all = queueData ?? [];
		if (activeFilter === "all") return all;
		return all.filter(item => item.status === activeFilter);
	}, [queueData, activeFilter]);

	const waitingCount = useMemo(
		() => (queueData ?? []).filter(i => i.status === "WAITING").length,
		[queueData]
	);
	const vitalsCount = useMemo(
		() => (queueData ?? []).filter(i => i.status === "IN_VITALS").length,
		[queueData]
	);
	const doctorCount = useMemo(
		() => (queueData ?? []).filter(i => i.status === "WITH_DOCTOR").length,
		[queueData]
	);

	const handleCallNext = async () => {
		if (!user?.id) return;
		await callNextMutation.mutateAsync({
			clinicId
		});
	};

	const handleEnqueueSubmit = async (e: React.ChangeEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!selectedPatientId) return;

		await enqueueMutation.mutateAsync({
			clinicId,
			patientId: selectedPatientId,
			priority: priority === "urgent" ? 2 : priority === "priority" ? 1 : 0
		});

		setSelectedPatientId("");
		setPriority("normal");
		setIsEnqueueOpen(false);
	};

	return (
		<div className='mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8'>
			{/* Header */}
			<div className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
				<div>
					<div className='flex items-center gap-2'>
						<MaterialIcon
							className='text-2xl text-[var(--matcha-600)]'
							name='hourglass_top'
						/>
						<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
							Outpatient Waiting Room &amp; Triage
						</h1>
					</div>
					<p className='mt-1 text-sm text-[var(--warm-charcoal)]/80'>
						Real-time patient flow: Reception &rarr; Vitals Assessment &rarr;
						Physician Consultation
					</p>
				</div>

				<div className='flex items-center gap-3'>
					<Button
						className='gap-2 bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
						disabled={waitingCount === 0 || callNextMutation.isPending}
						onClick={handleCallNext}
						type='button'
					>
						<MaterialIcon name='notifications_active' />
						<span>Call Next Patient</span>
					</Button>

					<Dialog
						onOpenChange={setIsEnqueueOpen}
						open={isEnqueueOpen}
					>
						<DialogTrigger>
							<Button
								className='gap-2'
								type='button'
								variant='outline'
							>
								<MaterialIcon name='add_circle' />
								<span>Triage Walk-In</span>
							</Button>
						</DialogTrigger>
						<DialogContent className='bg-[var(--pure-white)]'>
							<DialogHeader>
								<DialogTitle>Triage &amp; Enqueue Walk-In</DialogTitle>
								<DialogDescription>
									Place an arrival in the clinic waiting room queue.
								</DialogDescription>
							</DialogHeader>
							<form
								className='space-y-4 py-2'
								onSubmit={handleEnqueueSubmit}
							>
								<div>
									<Label htmlFor='patientSelect'>Select Patient *</Label>
									<Select
										onValueChange={v => v && setSelectedPatientId(v)}
										value={selectedPatientId}
									>
										<SelectTrigger id='patientSelect'>
											<SelectValue placeholder='Choose registered patient...' />
										</SelectTrigger>
										<SelectContent className='max-h-56'>
											{patients.map(p => (
												<SelectItem
													key={p.id}
													value={p.id}
												>
													{p.firstName} {p.lastName}.patient
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className='mt-1 text-xs text-[var(--warm-charcoal)]/70'>
										Don't see the patient?{" "}
										<Link
											className='text-[var(--matcha-700)] underline'
											to='/patients'
										>
											Register them first
										</Link>
									</p>
								</div>

								<div>
									<Label htmlFor='prioritySelect'>Triage Priority</Label>
									<Select
										onValueChange={v =>
											v && setPriority(v as "normal" | "priority" | "urgent")
										}
										value={priority}
									>
										<SelectTrigger id='prioritySelect'>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='normal'>
												Normal (عادي) &bull; Routine checkup / follow-up
											</SelectItem>
											<SelectItem value='priority'>
												Priority (أولوية) &bull; High fever, neonates &lt; 28d
											</SelectItem>
											<SelectItem value='urgent'>
												Urgent (طارئ) &bull; Respiratory distress, dehydration
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<DialogFooter>
									<Button
										onClick={() => setIsEnqueueOpen(false)}
										type='button'
										variant='outline'
									>
										Cancel
									</Button>
									<Button
										className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
										disabled={!selectedPatientId || enqueueMutation.isPending}
										type='submit'
									>
										Add to Queue
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* Filter Pills */}
			<div className='mb-6 flex flex-wrap items-center gap-2 border-b border-[var(--oat-border)] pb-3'>
				<button
					className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
						activeFilter === "all"
							? "bg-[var(--matcha-600)] text-white"
							: "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)]"
					}`}
					onClick={() => setActiveFilter("all")}
					type='button'
				>
					All ({queueData?.length ?? 0})
				</button>
				<button
					className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
						activeFilter === "WAITING"
							? "bg-amber-600 text-white"
							: "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)]"
					}`}
					onClick={() => setActiveFilter("WAITING")}
					type='button'
				>
					Waiting ({waitingCount})
				</button>
				<button
					className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
						activeFilter === "IN_VITALS"
							? "bg-blue-600 text-white"
							: "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)]"
					}`}
					onClick={() => setActiveFilter("IN_VITALS")}
					type='button'
				>
					In Vitals ({vitalsCount})
				</button>
				<button
					className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
						activeFilter === "WITH_DOCTOR"
							? "bg-emerald-600 text-white"
							: "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)]"
					}`}
					onClick={() => setActiveFilter("WITH_DOCTOR")}
					type='button'
				>
					With Doctor ({doctorCount})
				</button>
				<button
					className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
						activeFilter === "COMPLETED"
							? "bg-gray-700 text-white"
							: "bg-[var(--pure-white)] text-[var(--warm-charcoal)] hover:bg-[var(--oat-light)]"
					}`}
					onClick={() => setActiveFilter("COMPLETED")}
					type='button'
				>
					Completed
				</button>
			</div>

			{/* Queue Cards Grid / List */}
			{isQueueLoading ? (
				<div className='space-y-4'>
					<Skeleton className='h-24 w-full' />
					<Skeleton className='h-24 w-full' />
					<Skeleton className='h-24 w-full' />
				</div>
			) : filteredQueue.length === 0 ? (
				<Card className='border-[var(--oat-border)] bg-[var(--pure-white)] py-12 text-center'>
					<CardContent>
						<MaterialIcon
							className='text-4xl text-[var(--warm-charcoal)]/40'
							name='chair'
						/>
						<p className='mt-2 font-medium text-[var(--warm-charcoal)]'>
							No patients in this queue stage
						</p>
					</CardContent>
				</Card>
			) : (
				<div className='space-y-3'>
					{filteredQueue.map((entry, idx) => {
						const priorityClass =
							entry.priority >= 2
								? "border-red-300 bg-red-50 text-red-900"
								: entry.priority === 1
									? "border-blue-300 bg-blue-50 text-blue-900"
									: "border-gray-200 bg-gray-50 text-gray-800";

						const statusClass =
							entry.status === "WAITING"
								? "bg-amber-100 text-amber-900"
								: entry.status === "IN_VITALS"
									? "bg-blue-100 text-blue-900"
									: entry.status === "WITH_DOCTOR"
										? "bg-emerald-100 text-emerald-900"
										: "bg-gray-100 text-gray-800";

						return (
							<Card
								className='border-[var(--oat-border)] bg-[var(--pure-white)] transition-shadow hover:shadow-sm'
								key={entry.id}
							>
								<CardContent className='flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center'>
									{/* Patient & Ticket */}
									<div className='flex items-center gap-4'>
										<div className='font-headline flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--matcha-100)] text-lg font-extrabold text-[var(--matcha-800)]'>
											#{idx + 1}
										</div>
										<div>
											<div className='flex items-center gap-2'>
												<Link
													className='text-base font-bold text-[var(--clay-black)] hover:underline'
													params={{ patientId: entry.patientId }}
													to='/patients/$patientId'
												>
													{entry.patient?.firstName} {entry.patient?.lastName}
												</Link>
												<span className='rounded bg-[var(--oat-light)] px-1.5 py-0.5 font-mono text-xs font-semibold text-[var(--clay-black)]'>
													{entry.patient?.mrn}
												</span>
												<span
													className={`rounded border px-2 py-0.5 text-xs font-bold uppercase ${priorityClass}`}
												>
													{entry.priority}
												</span>
											</div>
											<p className='mt-1 text-xs text-[var(--warm-charcoal)]/80'>
												Arrived:{" "}
												{new Date(entry.createdAt).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit"
												})}{" "}
												&bull; Phone: {entry.patient.parentPhone || "None"}
											</p>
										</div>
									</div>

									{/* Status & Actions */}
									<div className='flex flex-wrap items-center gap-2'>
										<span
											className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClass}`}
										>
											{entry.status.replace("_", " ")}
										</span>

										{entry.status === "WAITING" && (
											<Button
												onClick={() =>
													updateStatusMutation.mutateAsync({
														id: entry.id,
														status: "IN_VITALS"
													})
												}
												size='sm'
												type='button'
												variant='outline'
											>
												Send to Vitals
											</Button>
										)}

										{(entry.status === "WAITING" ||
											entry.status === "IN_VITALS") && (
											<Button
												className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
												onClick={() =>
													updateStatusMutation.mutateAsync({
														id: entry.id,
														status: "WITH_DOCTOR"
													})
												}
												size='sm'
												type='button'
											>
												Call into Room
											</Button>
										)}

										{entry.status === "WITH_DOCTOR" && (
											<Button
												className='bg-emerald-600 text-white hover:bg-emerald-700'
												onClick={() =>
													updateStatusMutation.mutateAsync({
														id: entry.id,
														status: "COMPLETED"
													})
												}
												size='sm'
												type='button'
											>
												Mark Completed
											</Button>
										)}

										<Link
											params={{ patientId: entry.patientId }}
											to='/patients/$patientId'
										>
											<Button
												size='sm'
												type='button'
												variant='ghost'
											>
												View Chart
											</Button>
										</Link>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
