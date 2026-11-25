// apps/web/src/components/PageGuide.tsx

import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/material-icon';
import { useAppMode } from '@/lib/web/app-mode';

export interface GuideItem {
  icon: string;
  title: string;
  desc: string;
  titleAr?: string;
  titleEn?: string;
  descAr?: string;
  descEn?: string;
}

interface PageGuideProps {
  items: Array<GuideItem>;
  title?: string;
  titleAr?: string;
  titleEn?: string;
}

const getToggleHint = (open: boolean, isAr: boolean, count: number): string => {
  if (open) {
    return isAr ? 'إخفاء الدليل / Hide guide' : 'Hide guide / إخفاء الدليل';
  }

  return isAr
    ? `اضغط لعرض ${count} إرشادات / View ${count} tips`
    : `Click to view ${count} tips / عرض ${count} إرشادات`;
};

export const PageGuide = ({
  items,
  title,
  titleAr = 'دليل الاستخدام السريع',
  titleEn = 'Quick Clinic Guide',
}: PageGuideProps) => {
  const [open, setOpen] = useState(false);
  const { locale } = useAppMode();
  const isAr = locale === 'ar';

  const headingText = title ?? (isAr ? titleAr : titleEn);
  const toggleHint = getToggleHint(open, isAr, items.length);

  return (
    <div className="mb-8 overflow-hidden rounded-xl border-2 border-chart-6/30 bg-card">
      <Card>
        <button
          className="flex w-full cursor-pointer items-center justify-between p-4 transition-colors hover:bg-muted md:p-5"
          onClick={() => setOpen((prev) => !prev)}
          type="button"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chart-6/20">
              <span className="inline-flex text-lg text-chart-6">
                <MaterialIcon name="help" />
              </span>
            </div>
            <div className="text-start">
              <h3 className="font-heading font-bold text-foreground">
                {headingText}
              </h3>
              <p className="text-xs text-muted-foreground">{toggleHint}</p>
            </div>
          </div>
          <span className="inline-flex text-xl text-muted-foreground">
            <MaterialIcon name={open ? 'expand_less' : 'expand_more'} />
          </span>
        </button>

        {open && (
          <div className="space-y-3 border-t border-border px-4 pt-4 pb-5 md:px-5">
            {items.map((item) => {
              const itemTitle = isAr
                ? (item.titleAr ?? item.title)
                : (item.titleEn ?? item.title);

              const itemDesc = isAr
                ? (item.descAr ?? item.desc)
                : (item.descEn ?? item.desc);

              return (
                <div
                  className="flex items-start gap-3 rounded-xl bg-muted p-3"
                  key={item.title}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card shadow-sm">
                    <span className="inline-flex text-sm text-primary">
                      <MaterialIcon name={item.icon} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 text-start">
                    <p className="text-sm font-bold text-foreground">
                      {itemTitle}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {itemDesc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
