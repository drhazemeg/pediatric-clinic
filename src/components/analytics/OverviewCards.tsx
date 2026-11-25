// apps/web/src/components/analytics/OverviewCards.tsx

import { Card, CardContent } from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatTime } from "@/utils/format";
import { LastSyncedBadge } from "./shared";

export interface ClinicAnalyticsOverview {
	totalVisits: number;
	completedVisits: number;
	cancelledVisits: number;
	protocolAdherencePct: number;
	clinicalAccuracyPct: number;
	totalConsultTimeSec: number;
	totalClinicalActions: number;
}

interface OverviewCardsProps {
	data: ClinicAnalyticsOverview | undefined;
	dataUpdatedAt?: number;
}

export function OverviewCards({ data, dataUpdatedAt }: OverviewCardsProps) {
	if (!data) return null;

	const cards = [
		{
			label: "Total Visits",
			value: data.totalVisits,
			icon: "stethoscope",
			bgClass: "bg-[var(--matcha-300)]/20",
			iconClass: "text-[var(--matcha-600)]"
		},
		{
			label: "Completed Encounters",
			value: data.completedVisits,
			icon: "check_circle",
			bgClass: "bg-[var(--matcha-300)]/20",
			iconClass: "text-[var(--matcha-600)]"
		},
		{
			label: "Protocol Adherence",
			value: `${data.protocolAdherencePct}%`,
			icon: "verified",
			bgClass: "bg-[var(--lemon-300)]/20",
			iconClass: "text-[var(--lemon-700)]"
		},
		{
			label: "Clinical Accuracy",
			value: `${data.clinicalAccuracyPct}%`,
			icon: "target",
			bgClass: "bg-[var(--ube-300)]/20",
			iconClass: "text-[var(--ube-600)]"
		},
		{
			label: "Total Consult Time",
			value: formatTime(data.totalConsultTimeSec),
			icon: "timer",
			bgClass: "bg-[var(--slushie-600)]/15",
			iconClass: "text-[var(--slushie-600)]"
		},
		{
			label: "Clinical Orders & Checks",
			value: data.totalClinicalActions,
			icon: "clinical_notes",
			bgClass: "bg-[var(--pomegranate-400)]/15",
			iconClass: "text-[var(--pomegranate-600)]"
		}
	];

	return (
		<div className='space-y-3'>
			{dataUpdatedAt !== undefined && (
				<div className='flex justify-end'>
					<LastSyncedBadge dataUpdatedAt={dataUpdatedAt} />
				</div>
			)}
			<div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6'>
				{cards.map(card => (
					<Card
						className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'
						key={card.label}
					>
						<CardContent className='p-4'>
							<div
								className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] ${card.bgClass}`}
							>
								<MaterialIcon
									className={card.iconClass}
									name={card.icon}
								/>
							</div>
							<div className='font-headline text-2xl font-extrabold text-[var(--clay-black)]'>
								{card.value}
							</div>
							<div className='mt-1 text-xs text-[var(--warm-charcoal)]'>
								{card.label}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
