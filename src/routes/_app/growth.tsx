// apps/web/src/routes/_app/growth.tsx

import type { Indicator } from '@/lib/features/development/index';

import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MaterialIcon } from '@/components/ui/material-icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGrowthCurves } from '@/hooks/use-growth';
import { authClient } from '@/lib/auth-client';
import { growthSearchSchema } from '@/lib/web/route-search-schemas';
import { routeShell } from '@/lib/web/route-shell';

const INDICATOR_LABELS: Record<Indicator, { title: string; unit: string }> = {
  'weight-for-age': {
    title: 'Weight-for-Age (الوزن بالنسبة للعمر)',
    unit: 'kg',
  },
  'length-for-age': {
    title: 'Length/Height-for-Age (الطول بالنسبة للعمر)',
    unit: 'cm',
  },
  'weight-for-length': {
    title: 'Weight-for-Length (الوزن بالنسبة للطول)',
    unit: 'kg',
  },
  'bmi-for-age': {
    title: 'BMI-for-Age (مؤشر كتلة الجسم)',
    unit: 'kg/m²',
  },
  'head-circumference-for-age': {
    title: 'Head Circumference-for-Age (محيط الرأس)',
    unit: 'cm',
  },
};

const isIndicator = (value: string): value is Indicator =>
  value === 'weight-for-age' ||
  value === 'length-for-age' ||
  value === 'weight-for-length' ||
  value === 'bmi-for-age' ||
  value === 'head-circumference-for-age';

const isSex = (value: string): value is 'male' | 'female' =>
  value === 'male' || value === 'female';

const GrowthStandardsComponent = () => {
  const search = Route.useSearch();

  const [indicator, setIndicator] = useState<Indicator>(search.indicator);

  const [sex, setSex] = useState<'male' | 'female'>(search.sex);
  const [maxMonths, setMaxMonths] = useState(search.maxMonths);

  const { data: curves, isLoading } = useGrowthCurves(
    indicator,
    sex,
    0,
    Math.trunc(Number(maxMonths)),
  );

  const currentInfo = INDICATOR_LABELS[indicator];
  const points = curves?.points ?? [];

  const renderGrowthTable = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 p-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (points.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No curves available for this selection.
        </p>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Age (Months)</TableHead>
            <TableHead>
              <span className="text-destructive">-3 SD (P0.1)</span>
            </TableHead>
            <TableHead>
              <span className="text-warning">-2 SD (P2.3)</span>
            </TableHead>
            <TableHead>
              <span className="text-muted-foreground">-1 SD (P15)</span>
            </TableHead>
            <TableHead>
              <span className="font-bold text-chart-2">
                Median / 0 SD (P50)
              </span>
            </TableHead>
            <TableHead>
              <span className="text-muted-foreground">+1 SD (P85)</span>
            </TableHead>
            <TableHead>
              <span className="text-warning">+2 SD (P97.7)</span>
            </TableHead>
            <TableHead>
              <span className="text-destructive">+3 SD (P99.9)</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {points.map((row) => (
            <TableRow key={row.x}>
              <TableCell>
                <span className="text-xs font-bold text-foreground">
                  {row.x} mo
                </span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-destructive">
                  {row.sd3neg}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-warning">
                  {row.sd2neg}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-muted-foreground">
                  {row.sd1neg}
                </span>
              </TableCell>
              <TableCell>
                <span className="rounded bg-chart-2/10 px-1.5 py-0.5 font-mono text-xs font-bold text-chart-2">
                  {row.median}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-muted-foreground">
                  {row.sd1}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-warning">
                  {row.sd2}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-destructive">
                  {row.sd3}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex text-2xl text-warning">
            <MaterialIcon name="monitoring" />
          </span>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            WHO &amp; Egyptian Pediatric Growth Standards
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Standard reference percentiles (P3, P15, P50, P85, P97) and Z-score
          standard deviations (منحنيات النمو القياسية)
        </p>
      </div>

      {/* Filter Controls */}
      <div className="mb-6 rounded-xl border border-border bg-card">
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="indicatorSelect">Growth Indicator</Label>
                <Select
                  onValueChange={(v) => {
                    if (isIndicator(v)) {
                      setIndicator(v);
                    }
                  }}
                  value={indicator}
                >
                  <SelectTrigger id="indicatorSelect">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight-for-age">
                      Weight-for-Age (الوزن بالنسبة للعمر)
                    </SelectItem>
                    <SelectItem value="length-for-age">
                      Length-for-Age (الطول بالنسبة للعمر)
                    </SelectItem>
                    <SelectItem value="weight-for-length">
                      Weight-for-Length (الوزن بالنسبة للطول)
                    </SelectItem>
                    <SelectItem value="head-circumference-for-age">
                      Head Circumference (محيط الرأس)
                    </SelectItem>
                    <SelectItem value="bmi-for-age">
                      BMI-for-Age (كتلة الجسم)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sexSelect">Sex</Label>
                <Select
                  onValueChange={(v) => {
                    if (isSex(v)) {
                      setSex(v);
                    }
                  }}
                  value={sex}
                >
                  <SelectTrigger id="sexSelect">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Boys (الأولاد)</SelectItem>
                    <SelectItem value="female">Girls (البنات)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ageRange">Age Range (Months)</Label>
                <Select
                  onValueChange={(v) => {
                    if (v === '12' || v === '24' || v === '60') {
                      setMaxMonths(v);
                    }
                  }}
                  value={maxMonths}
                >
                  <SelectTrigger id="ageRange">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">0 to 12 months (Infancy)</SelectItem>
                    <SelectItem value="24">
                      0 to 24 months (Toddlerhood)
                    </SelectItem>
                    <SelectItem value="60">
                      0 to 60 months (Up to 5 years)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Standards Data Table */}
      <div className="mb-8 rounded-xl border border-border bg-card">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  <span className="text-base font-bold text-foreground">
                    {currentInfo.title} &bull;{' '}
                    {sex === 'male' ? 'Boys' : 'Girls'}
                  </span>
                </CardTitle>
                <CardDescription>
                  WHO Child Growth Standards Reference ({currentInfo.unit})
                </CardDescription>
              </div>
              <span className="rounded bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                Standard LMS Model
              </span>
            </div>
          </CardHeader>
          <CardContent>{renderGrowthTable()}</CardContent>
        </Card>
      </div>

      {/* Clinical Cut-off Diagnostic Notes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-warning/30 bg-warning/10">
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="text-sm font-bold text-foreground">
                  Moderate Undernutrition (MAM)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Z-score between <strong>-2 SD and -3 SD</strong>. Requires
                nutritional evaluation, counseling on complementary feeding, and
                bi-weekly follow-up.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/10">
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="text-sm font-bold text-destructive">
                  Severe Acute Malnutrition (SAM)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Z-score &lt; <strong>-3 SD</strong> or bilateral pitting edema.
                Immediate outpatient RUTF therapy or inpatient referral if
                complications exist.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border border-chart-6/30 bg-chart-6/10">
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="text-sm font-bold text-foreground">
                  Overweight &amp; Obesity
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                BMI or weight-for-length &gt; <strong>+2 SD</strong>{' '}
                (overweight) or &gt; <strong>+3 SD</strong> (obese). Evaluate
                sugary drink intake, screen for metabolic risk.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_app/growth')({
  staticData: routeShell.app,
  validateSearch: growthSearchSchema,
  component: GrowthStandardsComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
      throw redirect({ to: '/login' });
    }

    return { session };
  },
});
