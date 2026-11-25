// growth/queries.ts — fixes only (imports + bandFor + fetchChildMeasurements)

import type {
  ChartBand,
  ChartCurves,
  ChartPoint,
  ChartPointValues,
  Indicator,
  IndicatorSeriesRow,
  LmsTriple,
  Sex,
  fetchGrowthStandardsSchema,
} from '@/lib/features/development/index';
import type { RangeFor } from '@/lib/features/development/types/sheets';
import type { z } from 'zod';

import {
  LmsDomainError,
  interpolateLms,
  valueAtZScore,
} from '@/lib/features/development/index';
import { DOMAIN } from '@/lib/features/development/types/sheets';

import { and, db, eq } from '..';
import { growthStandards } from '../schema';

const REFERENCE_VERSION = 'egyptian-2021' as const;

// 2. bandFor must match the canonical ChartPointValues shape
const bandFor = (lms: LmsTriple): ChartPointValues => ({
  median: valueAtZScore(lms, 0),
  sd3neg: valueAtZScore(lms, -3),
  sd2neg: valueAtZScore(lms, -2),
  sd1neg: valueAtZScore(lms, -1),
  sd1: valueAtZScore(lms, 1),
  sd2: valueAtZScore(lms, 2),
  sd3: valueAtZScore(lms, 3),
});

// 3. Guard nullable measuredAt in fetchChildMeasurements
export async function fetchChildMeasurements(
  patientId: string,
  metric: 'lhfa' | 'wfa',
) {
  const patient = await db.query.patients.findFirst({
    where: { id: patientId },
    columns: { dateOfBirth: true },
  });

  if (patient === undefined || patient.dateOfBirth === '') {
    throw new Error('Patient birth date not found');
  }

  const birth = new Date(patient.dateOfBirth).getTime();

  if (!Number.isFinite(birth)) {
    throw new TypeError(`Patient ${patientId} has an invalid date of birth`);
  }

  const rows = await db.query.measurements.findMany({
    where: {
      patientId,
      indicator: metric === 'lhfa' ? 'length-for-age' : 'weight-for-age',
    },
    columns: { value: true, measuredAt: true },
    with: { visit: { columns: { visitedAt: true } } },
    orderBy: { measuredAt: 'asc' },
  });

  const out: Array<{ day: number; value: number }> = [];

  for (const row of rows) {
    const at = row.visit.visitedAt;

    out.push({
      day: Math.round((at.getTime() - birth) / 86_400_000),
      value: row.value,
    });
  }

  return out;
}
// ---------------------------------------------------------------------------
// Internal: domain guard
// ---------------------------------------------------------------------------

const assertInDomain = <TIndicator extends Indicator>(
  indicator: TIndicator,
  range: RangeFor<TIndicator>,
): void => {
  const bounds = DOMAIN[indicator][range.xAxis];

  if (bounds === undefined) {
    throw new LmsDomainError(
      `${indicator} has no ${range.xAxis}-axis coverage`,
      {
        indicator,
        xAxis: range.xAxis,
      },
    );
  }

  if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) {
    throw new LmsDomainError('min/max must be finite', { indicator, range });
  }

  if (range.min > range.max) {
    throw new LmsDomainError('min > max', { indicator, range });
  }

  if (range.min < bounds.min || range.max > bounds.max) {
    throw new LmsDomainError(
      `${indicator}/${range.xAxis} domain is [${bounds.min}, ${bounds.max}]; ` +
        `requested [${range.min}, ${range.max}]`,
      { indicator, range, bounds },
    );
  }
};

// ---------------------------------------------------------------------------
// Internal: band construction
// ---------------------------------------------------------------------------

export async function getGrowthChartCurves<TIndicator extends Indicator>(
  indicator: TIndicator,
  sex: Sex,
  range: RangeFor<TIndicator>,
): Promise<ChartCurves> {
  assertInDomain(indicator, range);

  const refs = await db.query.lmsReferences.findMany({
    where: {
      indicator,
      sex,
      xAxis: range.xAxis,
      version: REFERENCE_VERSION,
      xValue: { gte: range.min, lte: range.max },
    },
    orderBy: { xValue: 'asc' },
  });

  const points: Array<ChartPoint> = refs.map((r) => ({
    ...bandFor(r),
    x: r.xValue,
  }));

  return { indicator, sex, xAxis: range.xAxis, points };
}

// ---------------------------------------------------------------------------
// Public: many curves in parallel (dashboards)
// ---------------------------------------------------------------------------

/**
 * A single curve request, discriminated so `RangeFor<I>` narrowing survives
 * across the map. `weight-for-length` is length-based; everything else is
 * age-based.
 */
export type CurveRequest =
  | {
      indicator: 'weight-for-length';
      sex: Sex;
      range: { xAxis: 'length'; min: number; max: number };
    }
  | {
      indicator: Exclude<Indicator, 'weight-for-length'>;
      sex: Sex;
      range: { xAxis: 'age'; min: number; max: number };
    };

/**
 * Fetch several curve sets concurrently. Rejects if any single request fails;
 * the thrown `LmsDomainError` carries `{ index, indicator, sex, range }` in
 * its `context` and the original error as `cause`.
 */
export async function getGrowthChartCurvesMany(
  requests: ReadonlyArray<CurveRequest>,
): Promise<Array<ChartCurves>> {
  return await Promise.all(
    requests.map(async (req, i) => {
      try {
        // Both branches narrow `req.range` to the exact `RangeFor<I>` the
        // generic expects — no `as never` needed.
        return await getGrowthChartCurves(req.indicator, req.sex, req.range);
      } catch (error) {
        if (error instanceof LmsDomainError) {
          throw new LmsDomainError(
            `getGrowthChartCurvesMany[${i}] (${req.indicator}/${req.sex}): ${error.message}`,
            {
              ...error.context,
              index: i,
              indicator: req.indicator,
              sex: req.sex,
              range: req.range,
              cause: error,
            },
          );
        }

        throw error;
      }
    }),
  );
}

export async function getGrowthChartBand<TIndicator extends Indicator>(
  indicator: TIndicator,
  sex: Sex,
  range: RangeFor<TIndicator>,
  x: number,
): Promise<
  | (ChartBand & {
      indicator: TIndicator;
      sex: Sex;
      xAxis: RangeFor<TIndicator>['xAxis'];
    })
  | null
> {
  assertInDomain(indicator, range);

  if (!Number.isFinite(x) || x < range.min || x > range.max) {
    return null;
  }

  const [below, above] = await Promise.all([
    db.query.lmsReferences.findFirst({
      where: {
        indicator,
        sex,
        xAxis: range.xAxis,
        version: REFERENCE_VERSION,
        xValue: { lte: x },
      },
      orderBy: { xValue: 'desc' },
    }),
    db.query.lmsReferences.findFirst({
      where: {
        indicator,
        sex,
        xAxis: range.xAxis,
        version: REFERENCE_VERSION,
        xValue: { gte: x },
      },
      orderBy: { xValue: 'asc' },
    }),
  ]);

  // The seed does not cover `x` on at least one side: refuse to extrapolate.
  if (below === undefined || above === undefined) {
    return null;
  }

  const interpolated: LmsTriple =
    below.xValue === above.xValue
      ? { l: below.l, m: below.m, s: below.s }
      : interpolateLms(
          x,
          { x: below.xValue, l: below.l, m: below.m, s: below.s },
          { x: above.xValue, l: above.l, m: above.m, s: above.s },
        );

  return {
    x,
    indicator,
    sex,
    xAxis: range.xAxis,
    ...bandFor(interpolated),
  };
}

/** Measurement panel for one patient's latest visit. */
export async function latestPanelViaRelations(patientId: string) {
  const latest = await db.query.visits.findFirst({
    where: { patientId },
    orderBy: { visitedAt: 'desc' },
    with: {
      measurements: {
        orderBy: { indicator: 'asc' },
      },
    },
  });

  return latest?.measurements ?? [];
}

// ---------------------------------------------------------------------------
// Read: trend
// ---------------------------------------------------------------------------

/**
 * Trend for one indicator across all visits — the data behind a growth chart.
 * Returns `{ x: ageMonths, y: value, zScore }`, oldest first.
 */
export async function indicatorTrend(patientId: string, indicator: Indicator) {
  const rows = await db.query.measurements.findMany({
    where: {
      indicator,
      visit: { patientId },
    },
    columns: {
      value: true,
      zScore: true,
      percentile: true,
      classification: true,
    },
    with: {
      visit: {
        columns: { visitedAt: true, ageMonths: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((r) => ({
    x: r.visit.ageMonths,
    visitedAt: r.visit.visitedAt,
    y: r.value,
    zScore: r.zScore,
    percentile: r.percentile,
    classification: r.classification,
  }));
}

export async function fetchGrowthStandards(
  input: z.infer<typeof fetchGrowthStandardsSchema>,
) {
  // Query your `growthStandards` table filtered by metric + gender,
  // ordered by day ascending.
  return await db
    .select()
    .from(growthStandards)
    .where(
      and(
        eq(growthStandards.metric, input.metric),
        eq(growthStandards.gender, input.gender),
      ),
    )
    .orderBy(growthStandards.day);
}

export async function listIndicatorSeries(
  patientId: string,
  indicator: Indicator,
): Promise<Array<IndicatorSeriesRow>> {
  const rows = await db.query.measurements.findMany({
    where: { indicator, visit: { patientId } },
    columns: {
      id: true,
      value: true,
      zScore: true,
      percentile: true,
      classification: true,
      lmsL: true,
      lmsM: true,
      lmsS: true,
      visitId: true,
    },
    with: { visit: { columns: { visitedAt: true, ageMonths: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const lengthByVisitId = new Map<string, number>();

  if (indicator === 'weight-for-length' && rows.length > 0) {
    const visitIds = [...new Set(rows.map((r) => r.visitId))];

    const lengths = await db.query.measurements.findMany({
      where: { indicator: 'length-for-age', visitId: { in: visitIds } },
      columns: { value: true, visitId: true },
    });

    for (const l of lengths) {
      lengthByVisitId.set(l.visitId, l.value);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    value: r.value,
    zScore: r.zScore ?? null,
    percentile: r.percentile ?? null,
    classification: r.classification ?? null,
    lmsL: r.lmsL ?? null,
    lmsM: r.lmsM ?? null,
    lmsS: r.lmsS ?? null,
    lengthCm:
      indicator === 'weight-for-length'
        ? (lengthByVisitId.get(r.visitId) ?? null)
        : null,
    visit: {
      visitedAt: r.visit.visitedAt,
      ageMonths: r.visit.ageMonths,
    },
  }));
}
