// apps/web/src/components/analytics/ChartsBundle.tsx

import type {
  CareDomainItem,
  ClinicalCategoryItem,
  EncounterFormatItem,
} from './breakdown-charts';
import type { ClinicalTrendPoint } from './score-trend-chart';
import type {
  DomainTimeItem,
  TimeTrendItem,
  VisitTypeTimeItem,
} from './time-analytics-panel';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { BreakdownCharts } from './breakdown-charts';
import { ScoreTrendChart } from './score-trend-chart';
import { LastSyncedBadge } from './shared';
import { TimeAnalyticsPanel } from './time-analytics-panel';

interface ChartsBundleProps {
  trend: Array<ClinicalTrendPoint> | undefined;
  byCategory: Array<ClinicalCategoryItem> | undefined;
  byDomain: Array<CareDomainItem> | undefined;
  byFormat: Array<EncounterFormatItem> | undefined;
  domainTime: Array<DomainTimeItem> | undefined;
  visitTypeTime: Array<VisitTypeTimeItem> | undefined;
  timeTrend: Array<TimeTrendItem> | undefined;
  /** Timestamp (ms) from persisted TanStack Query cache (`query.dataUpdatedAt`) */
  dataUpdatedAt?: number;
}

const ChartsBundle = ({
  trend,
  byCategory,
  byDomain,
  byFormat,
  domainTime,
  visitTypeTime,
  timeTrend,
  dataUpdatedAt,
}: ChartsBundleProps) => (
  <Tabs defaultValue="trend">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <TabsList>
        <TabsTrigger value="trend">Adherence Trend</TabsTrigger>
        <TabsTrigger value="breakdown">Clinical Breakdown</TabsTrigger>
        <TabsTrigger value="duration">Consult Duration</TabsTrigger>
      </TabsList>

      <LastSyncedBadge dataUpdatedAt={dataUpdatedAt} />
    </div>

    <TabsContent value="trend">
      <div className="pt-6">
        <ScoreTrendChart data={trend} />
      </div>
    </TabsContent>

    <TabsContent value="breakdown">
      <div className="pt-6">
        <BreakdownCharts
          byCategory={byCategory}
          byDomain={byDomain}
          byFormat={byFormat}
        />
      </div>
    </TabsContent>

    <TabsContent value="duration">
      <div className="pt-6">
        <TimeAnalyticsPanel
          domainTime={domainTime}
          timeTrend={timeTrend}
          visitTypeTime={visitTypeTime}
        />
      </div>
    </TabsContent>
  </Tabs>
);

export default ChartsBundle;
