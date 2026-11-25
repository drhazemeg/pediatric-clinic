// apps/web/src/routes/jobs.tsx

import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@/components/ui/table";
import { useJobs } from "@/hooks/use-jobs";
import { authClient } from "@/lib/auth-client";
import { routeShell } from "@/lib/web/route-shell";

export const Route = createFileRoute("/_app/jobs")({
	staticData: routeShell.app,
	component: JobsMonitorComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session };
	}
});

const TASK_LABELS: Record<string, string> = {
	ai_soap_draft: "AI SOAP Note Drafting",
	ai_patient_education: "Bilingual Parent Education Instructions",
	ai_differential_dx: "Differential Diagnosis Support",
	ai_dosing_safety: "Pediatric Dosing Safety Verification",
	ai_growth_interpretation: "Growth & Anthropometry Insights",
	ai_immunization_advice: "Immunization Catch-Up Guidance",
	growth_recalc: "Batch Growth Percentiles Recalculation",
	immunization_schedule_refresh: "National MOH Schedule Sync"
};

function JobsMonitorComponent() {
	const { activeJobs, activeCount, completedResults, removeJob, myJobsQuery } =
		useJobs();

	const jobList = myJobsQuery.data?.items ?? [];
	const isLoading = myJobsQuery.isLoading;

	return (
		<div className='mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8'>
			{/* Header */}
			<div className='mb-6'>
				<div className='flex items-center gap-2'>
					<MaterialIcon
						className='text-2xl text-purple-600'
						name='psychology'
					/>
					<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
						Clinical Task &amp; AI Processing Monitor
					</h1>
				</div>
				<p className='mt-1 text-sm text-[var(--warm-charcoal)]/80'>
					Real-time status of asynchronous clinical intelligence tasks, SOAP
					note drafting, and safety audits
				</p>
			</div>

			{/* Active Jobs Live Banner (if any running) */}
			{activeCount > 0 && (
				<Card className='mb-6 border-purple-200 bg-purple-50/70'>
					<CardHeader className='pb-3'>
						<div className='flex items-center gap-2'>
							<MaterialIcon
								className='animate-spin text-purple-700'
								name='sync'
							/>
							<CardTitle className='text-sm font-bold text-purple-950'>
								{activeCount} Active Clinical Job{activeCount > 1 ? "s" : ""}{" "}
								Processing
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className='divide-y divide-purple-200'>
						{activeJobs.map(job => (
							<div
								className='flex items-center justify-between py-2 text-xs'
								key={job.id}
							>
								<div>
									<p className='font-bold text-purple-950'>
										{TASK_LABELS[job.kind] || job.kind}
									</p>
									<p className='font-mono text-[10px] text-purple-800'>
										ID: {job.id} &bull; Status: {job.status}
									</p>
								</div>
								<Button
									className='text-purple-900 hover:text-purple-950'
									onClick={() => removeJob(job.id)}
									size='sm'
									type='button'
									variant='ghost'
								>
									Dismiss
								</Button>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* Jobs History Table */}
			<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div>
							<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
								Task History &amp; Audit Trail
							</CardTitle>
							<CardDescription>
								Recent background jobs and AI assistance requests
							</CardDescription>
						</div>
						<Button
							disabled={myJobsQuery.isFetching}
							onClick={() => myJobsQuery.refetch()}
							size='sm'
							type='button'
							variant='outline'
						>
							<MaterialIcon
								className={`mr-1 text-xs ${myJobsQuery.isFetching ? "animate-spin" : ""}`}
								name='refresh'
							/>
							<span>Refresh</span>
						</Button>
					</div>
				</CardHeader>
				<CardContent className='p-0'>
					{isLoading ? (
						<div className='space-y-3 p-6'>
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-full' />
						</div>
					) : jobList.length === 0 &&
						Object.keys(completedResults).length === 0 ? (
						<div className='py-12 text-center'>
							<MaterialIcon
								className='text-4xl text-[var(--warm-charcoal)]/40'
								name='task_alt'
							/>
							<p className='mt-2 font-medium text-[var(--warm-charcoal)]'>
								No clinical tasks logged
							</p>
							<p className='text-xs text-[var(--warm-charcoal)]/70'>
								Background jobs triggered from encounter SOAP notes or
								calculators will appear here.
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Task Description</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Created At</TableHead>
									<TableHead>Details / Result</TableHead>
									<TableHead className='text-end'>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{jobList.map(
									(job: {
										id: string;
										kind: string;
										status: string;
										createdAt: Date;
										errorMessage?: string | null;
										resultJson?: unknown;
									}) => {
										const statusClass =
											job.status === "completed"
												? "bg-emerald-100 text-emerald-800"
												: job.status === "failed"
													? "bg-red-100 text-red-800"
													: job.status === "cancelled"
														? "bg-gray-100 text-gray-800"
														: "bg-blue-100 text-blue-800";

										return (
											<TableRow key={job.id}>
												<TableCell>
													<p className='text-xs font-bold text-[var(--clay-black)]'>
														{TASK_LABELS[job.kind] || job.kind}
													</p>
													<p className='font-mono text-[10px] text-[var(--warm-charcoal)]/70'>
														{job.id}
													</p>
												</TableCell>
												<TableCell>
													<span
														className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${statusClass}`}
													>
														{job.status}
													</span>
												</TableCell>
												<TableCell className='text-xs text-[var(--warm-charcoal)]'>
													{new Date(job.createdAt).toLocaleString([], {
														dateStyle: "short",
														timeStyle: "short"
													})}
												</TableCell>
												<TableCell className='text-xs text-[var(--warm-charcoal)]/80'>
													{job.errorMessage ? (
														<span className='font-semibold text-red-600'>
															{job.errorMessage}
														</span>
													) : job.resultJson ? (
														<span className='font-medium text-emerald-700'>
															Ready (Output generated)
														</span>
													) : (
														"-"
													)}
												</TableCell>
												<TableCell className='text-end'>
													{job.status === "failed" && (
														<Button
															onClick={() => removeJob(job.id)}
															size='sm'
															type='button'
															variant='outline'
														>
															Dismiss
														</Button>
													)}
												</TableCell>
											</TableRow>
										);
									}
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
