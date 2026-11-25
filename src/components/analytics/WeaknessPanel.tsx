// apps/web/src/components/analytics/WeaknessPanel.tsx

import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatLabel } from "@/utils/format";
import { LastSyncedBadge } from "./shared";

export interface ClinicalCareGap {
	type: "immunization" | "growth" | "documentation";
	name: string;
	totalEncounters: number;
	adherencePct: number;
}

interface WeaknessPanelProps {
	careGaps: ClinicalCareGap[] | undefined;
	recommendations: string[] | undefined;
	dataUpdatedAt?: number;
}

function getTypeIcon(type: ClinicalCareGap["type"]) {
	switch (type) {
		case "immunization":
			return "vaccines";
		case "growth":
			return "show_chart";
		case "documentation":
			return "clinical_notes";
	}
}

function getTypeLabel(type: ClinicalCareGap["type"]) {
	switch (type) {
		case "immunization":
			return "Immunization";
		case "growth":
			return "Growth";
		case "documentation":
			return "Protocol";
	}
}

function getTypeRoute(type: ClinicalCareGap["type"]) {
	switch (type) {
		case "immunization":
			return "/immunizations" as const;
		case "growth":
			return "/growth" as const;
		case "documentation":
			return "/patients" as const;
	}
}

function getSeverityColor(pct: number) {
	if (pct < 50) return "text-[var(--pomegranate-600)]";
	if (pct < 75) return "text-[var(--lemon-700)]";
	return "text-[var(--matcha-600)]";
}

function getSeverityLabel(pct: number) {
	if (pct < 50) return "High priority";
	if (pct < 75) return "Needs attention";
	return "On track";
}

export function WeaknessPanel({
	careGaps,
	recommendations,
	dataUpdatedAt
}: WeaknessPanelProps) {
	const hasData = careGaps && careGaps.length > 0;

	return (
		<Card className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'>
			<CardHeader className='flex flex-row flex-wrap items-center justify-between gap-2'>
				<CardTitle className='font-headline flex items-center gap-2 text-lg font-bold text-[var(--clay-black)]'>
					<MaterialIcon
						className='text-[var(--pomegranate-600)]'
						name='analytics'
					/>
					Clinical Care Gaps &amp; Quality Insights
				</CardTitle>
				{dataUpdatedAt !== undefined && (
					<LastSyncedBadge dataUpdatedAt={dataUpdatedAt} />
				)}
			</CardHeader>
			<CardContent className='space-y-6'>
				{hasData ? (
					<>
						<div className='space-y-2'>
							{careGaps.map(gap => (
								<div
									className='flex items-center gap-3 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--warm-cream)] p-4'
									key={`${gap.type}-${gap.name}`}
								>
									<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--oat-light)]'>
										<MaterialIcon
											className='text-[var(--warm-charcoal)]'
											name={getTypeIcon(gap.type)}
										/>
									</div>
									<div className='min-w-0 flex-1'>
										<div className='flex items-center gap-2'>
											<span className='text-xs font-medium tracking-wide text-[var(--warm-silver)] uppercase'>
												{getTypeLabel(gap.type)}
											</span>
											<span
												className={`text-xs font-medium ${getSeverityColor(gap.adherencePct)}`}
											>
												{getSeverityLabel(gap.adherencePct)}
											</span>
										</div>
										<div className='truncate text-sm font-semibold text-[var(--clay-black)]'>
											{formatLabel(gap.name)}
										</div>
										<div className='mt-0.5 text-xs text-[var(--warm-charcoal)]'>
											{gap.totalEncounters} encounters · {gap.adherencePct}%
											adherence
										</div>
									</div>
									<Link
										className='clay-hover shrink-0 rounded-[var(--radius-lg)] bg-[var(--clay-black)] px-3 py-1.5 text-xs font-semibold text-[var(--pure-white)] transition-all hover:bg-[var(--warm-charcoal)]'
										to={getTypeRoute(gap.type)}
									>
										Review
									</Link>
								</div>
							))}
						</div>

						{recommendations && recommendations.length > 0 && (
							<div className='space-y-2'>
								<h4 className='text-sm font-semibold text-[var(--clay-black)]'>
									Clinical Recommendations
								</h4>
								<ul className='space-y-2'>
									{recommendations.map(rec => (
										<li
											className='flex items-start gap-2 text-sm text-[var(--warm-charcoal)]'
											key={rec}
										>
											<MaterialIcon
												className='mt-0.5 shrink-0 text-[var(--lemon-700)]'
												name='lightbulb'
											/>
											<span>{rec}</span>
										</li>
									))}
								</ul>
							</div>
						)}
					</>
				) : (
					<div className='py-8 text-center text-[var(--warm-charcoal)]'>
						<MaterialIcon
							className='mx-auto mb-3 text-5xl text-[var(--warm-silver)]'
							name='insights'
						/>
						<p className='font-semibold'>Not enough encounter data yet</p>
						<p className='mt-1 text-sm'>
							Record more pediatric visits, growth measurements, and vaccines to
							surface care gaps.
						</p>
						<Link
							className='clay-hover mt-4 inline-block rounded-[var(--radius-lg)] bg-[var(--clay-black)] px-4 py-2 text-sm font-semibold text-[var(--pure-white)] transition-all hover:bg-[var(--warm-charcoal)]'
							to='/patients'
						>
							View Patients
						</Link>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
