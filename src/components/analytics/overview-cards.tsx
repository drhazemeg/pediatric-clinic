// apps/web/src/components/analytics/OverviewCards.tsx

import { Card, CardContent } from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/material-icon';
import { formatTime } from '@/utils/format';

import { LastSyncedBadge } from './shared';

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

export const OverviewCards = ({ data, dataUpdatedAt }: OverviewCardsProps) => {
  if (!data) {
    return null;
  }

  const cards = [
    {
      label: 'Total Visits',
      value: data.totalVisits,
      icon: 'stethoscope',
      bgClass: 'bg-primary/15',
      iconClass: 'text-primary',
    },
    {
      label: 'Completed Encounters',
      value: data.completedVisits,
      icon: 'check_circle',
      bgClass: 'bg-chart-2/15',
      iconClass: 'text-chart-2',
    },
    {
      label: 'Protocol Adherence',
      value: `${data.protocolAdherencePct}%`,
      icon: 'verified',
      bgClass: 'bg-warning/15',
      iconClass: 'text-warning',
    },
    {
      label: 'Clinical Accuracy',
      value: `${data.clinicalAccuracyPct}%`,
      icon: 'target',
      bgClass: 'bg-chart-3/15',
      iconClass: 'text-chart-3',
    },
    {
      label: 'Total Consult Time',
      value: formatTime(data.totalConsultTimeSec),
      icon: 'timer',
      bgClass: 'bg-chart-6/15',
      iconClass: 'text-chart-6',
    },
    {
      label: 'Clinical Orders & Checks',
      value: data.totalClinicalActions,
      icon: 'clinical_notes',
      bgClass: 'bg-destructive/15',
      iconClass: 'text-destructive',
    },
  ];

  return (
    <div className="space-y-3">
      {dataUpdatedAt !== undefined && (
        <div className="flex justify-end">
          <LastSyncedBadge dataUpdatedAt={dataUpdatedAt} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <div
            className="rounded-xl border-2 border-border bg-card shadow-sm"
            key={card.label}
          >
            <Card>
              <CardContent>
                <div className="p-1">
                  <div
                    className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.bgClass}`}
                  >
                    <span className={`inline-flex ${card.iconClass}`}>
                      <MaterialIcon name={card.icon} />
                    </span>
                  </div>
                  <div className="font-heading text-2xl font-extrabold text-foreground">
                    {card.value}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {card.label}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};
