// apps/web/src/components/finance/FinanceCategoryBreakdown.tsx

import { MaterialIcon } from '@/components/ui/material-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEgp } from '@/hooks/use-finance';
import { getCategoryMeta } from '@/lib/web/finance-constants';

interface CategoryBreakdown {
  category: string;
  amountCents: number;
  count: number;
}

interface Props {
  items: Array<CategoryBreakdown>;
  isLoading: boolean;
  kind: 'revenue' | 'expense';
}

const SKELETON_KEYS = ['cat-skel-1', 'cat-skel-2', 'cat-skel-3', 'cat-skel-4'];

const WIDTH_STEPS = [
  'w-0',
  'w-1/12',
  'w-2/12',
  'w-3/12',
  'w-4/12',
  'w-5/12',
  'w-6/12',
  'w-7/12',
  'w-8/12',
  'w-9/12',
  'w-10/12',
  'w-11/12',
  'w-full',
] as const;

const getBarWidthClass = (pct: number): string => {
  const step = Math.max(
    pct > 0 ? 1 : 0,
    Math.min(12, Math.round((pct / 100) * 12)),
  );

  return WIDTH_STEPS[step] ?? 'w-0';
};

export const FinanceCategoryBreakdown = ({ items, isLoading, kind }: Props) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {SKELETON_KEYS.map((id) => (
          <Skeleton className="h-12 w-full" key={id} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        <span className="mb-1 inline-flex text-2xl text-muted-foreground/60">
          <MaterialIcon name="category" />
        </span>
        <p>No {kind} categories recorded in this period</p>
      </div>
    );
  }

  const totalAmount = items.reduce((acc, i) => acc + i.amountCents, 0);
  const barColor = kind === 'revenue' ? 'bg-chart-2' : 'bg-destructive';
  const textColor = kind === 'revenue' ? 'text-chart-2' : 'text-destructive';

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const pct =
          totalAmount > 0
            ? Math.round((item.amountCents / totalAmount) * 100)
            : 0;

        const meta = getCategoryMeta(item.category) ?? {
          icon: kind === 'revenue' ? 'payments' : 'receipt_long',
          ar: item.category,
          en: item.category,
          kind,
        };

        return (
          <li
            className="space-y-1.5 rounded-lg border border-border/60 bg-card p-2.5 transition-colors hover:border-border"
            key={item.category}
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex text-base text-muted-foreground">
                  <MaterialIcon name={meta.icon} />
                </span>
                <span className="font-semibold text-foreground">
                  {item.category}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({meta.ar})
                </span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  ×{item.count}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {pct}%
                </span>
                <span className={`font-mono font-bold ${textColor}`}>
                  {formatEgp(item.amountCents)}
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                aria-hidden="true"
                className={`h-full rounded-full transition-all duration-500 ${barColor} ${getBarWidthClass(pct)}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};
