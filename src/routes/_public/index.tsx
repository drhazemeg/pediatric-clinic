// apps/web/src/routes/_public.index.tsx

import {
  Link,
  createFileRoute,
  isRedirect,
  redirect,
} from '@tanstack/react-router';
import { useMemo } from 'react';

import { OptimizedImage } from '@/components/optimized-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/material-icon';
import { authClient } from '@/lib/auth-client';
import { CLINIC_BRAND } from '@/lib/web/constants';

const SIX_CLINIC_SERVICES = [
  {
    id: 'newborn',
    icon: 'child_care',
    titleAr: 'رعاية حديثي الولادة',
    titleEn: 'Newborn Care',
    descAr:
      'متابعة الأيام الأولى بعد الولادة، الصفراء، السرة، والوزن اليومي بدقة.',
    descEn:
      'Early neonatal checks, jaundice screening, cord care, and daily weight tracking.',
  },
  {
    id: 'lactation',
    icon: 'breastfeeding',
    titleAr: 'استشارات الرضاعة الطبيعية (IBCLC)',
    titleEn: 'Lactation Consulting (IBCLC)',
    descAr:
      'تصحيح وضعية الالتقام، زيادة إدرار الحليب، ومعالجة آلام الرضاعة والاحتقان.',
    descEn:
      'Latch optimization, milk supply support, engorgement relief, and infant feeding plans.',
  },
  {
    id: 'immunizations',
    icon: 'vaccines',
    titleAr: 'التطعيمات الأساسية والاختيارية',
    titleEn: 'Immunizations',
    descAr:
      'تطبيق جدول التطعيمات المعتمد وجداول التعويض ومتابعة ما بعد التطعيم.',
    descEn:
      'Routine schedules, catch-up planning, and post-vaccination guidance.',
  },
  {
    id: 'sick-visits',
    icon: 'stethoscope',
    titleAr: 'كشف الحالات الحادة والعدوى',
    titleEn: 'Sick Visits',
    descAr:
      'تقييم الحرارة، النزلات المعوية، والتهابات الجهاز التنفسي بجرعات دوائية محسوبة بالوزن.',
    descEn:
      'Fever, respiratory, and GI evaluations with weight-calculated pediatric dosing.',
  },
  {
    id: 'chronic-care',
    icon: 'monitoring',
    titleAr: 'المتابعة المزمنة والحساسية',
    titleEn: 'Chronic & Allergy Care',
    descAr:
      'متابعة حساسية الألبان والجلد، الربو الشعبي، وسوء امتصاص أو تأخر اكتساب الوزن.',
    descEn:
      'Ongoing care for allergies, wheezing/asthma, and faltering weight gain.',
  },
  {
    id: 'well-child',
    icon: 'show_chart',
    titleAr: 'متابعة النمو والتطور الحركي',
    titleEn: 'Well-Child & Growth',
    descAr:
      'منحنيات النمو العالمية والمصرية (WHO / Egyptian) وفحص المهارات التطورية لكل مرحلة.',
    descEn:
      'WHO and Egyptian LMS growth tracking with age-appropriate developmental checks.',
  },
] as const;

const CARE_PILLARS = [
  {
    icon: 'monitoring',
    titleAr: 'تقييم النمو بالمنحنيات العالمية والمصرية',
    titleEn: 'WHO & Egyptian Growth Standards',
    descAr: 'قراءة دقيقة للوزن والطول ومحيط الرأس ومتابعة التطور.',
    descEn: 'Structured tracking of growth and age-appropriate milestones.',
  },
  {
    icon: 'medication',
    titleAr: 'وصف علاجي محسوب حسب الوزن والعمر',
    titleEn: 'Weight-Dosed Pediatric Prescriptions',
    descAr: 'مراجعة الجرعات وتنبيهات الحساسية وتعليمات واضحة للأهل.',
    descEn:
      'Weight-linked dose checks, allergy review, and clear home guidance.',
  },
  {
    icon: 'support',
    titleAr: 'إرشاد عملي للأمهات والآباء',
    titleEn: 'Practical Parent & Lactation Guidance',
    descAr: 'خطط واضحة للتغذية التكميلية والنوم والرضاعة الطبيعية.',
    descEn: 'Actionable support for feeding, sleep, and breastfeeding.',
  },
] as const;

const PublicLandingPage = () => {
  const search = Route.useSearch();
  const isAr = search.lang === 'ar';
  const langSearch = useMemo(() => ({ lang: search.lang }), [search.lang]);

  return (
    <div className="space-y-16 py-10 sm:py-14">
      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-4xl border border-primary/10 bg-linear-to-br from-primary/5 via-background to-accent/20 p-4 shadow-sm sm:p-8 lg:p-10">
          <div className="grid items-center gap-7 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-5 px-1 py-2 sm:px-2">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary/10 px-3.5 py-2 text-xs leading-relaxed font-semibold text-primary">
                <span className="inline-flex text-sm">
                  <MaterialIcon name="verified" />
                </span>
                <span>
                  {isAr
                    ? CLINIC_BRAND.credentialsAr
                    : CLINIC_BRAND.credentialsEn}
                </span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                {isAr
                  ? 'رعاية متكاملة لصحة طفلك والرضاعة الطبيعية في الغردقة'
                  : 'Compassionate Pediatric & Lactation Care in Hurghada'}
              </h1>

              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                {isAr
                  ? 'عيادة د. حازم علي تقدم متابعة طبية دقيقة للرضع والأطفال من الولادة وحتى الطفولة، مع دعم تخصصي للرضاعة الطبيعية وتقييم النمو والتغذية.'
                  : 'Dr. Hazem Ali provides structured outpatient care from birth through childhood, combining pediatric medicine, certified lactation support, and growth tracking.'}
              </p>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  className="w-full sm:w-auto"
                  search={langSearch}
                  to="/contact"
                >
                  <Button className="w-full sm:w-auto" size="lg">
                    <span className="me-2 inline-flex text-base">
                      <MaterialIcon name="calendar_month" />
                    </span>
                    {isAr
                      ? 'حجز موعد ومعلومات العيادة'
                      : 'Booking & Clinic Info'}
                  </Button>
                </Link>

                <Link
                  className="w-full sm:w-auto"
                  search={langSearch}
                  to="/services"
                >
                  <Button
                    className="w-full sm:w-auto"
                    size="lg"
                    variant="outline"
                  >
                    {isAr ? 'استعراض الخدمات الطبية' : 'Explore All Services'}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative min-h-[260px] overflow-hidden rounded-2xl shadow-lg sm:min-h-[360px] lg:min-h-[410px]">
              <OptimizedImage
                alt={
                  isAr
                    ? 'غرفة رعاية أطفال هادئة ومجهزة'
                    : 'A calm, well-equipped pediatric clinic room'
                }
                className="absolute inset-0 h-full w-full object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                src="/clinic-hero-800.webp"
                srcset="/clinic-hero-400.webp 400w, /clinic-hero-800.webp 800w, /clinic-hero-1200.webp 1200w"
              />
              <div className="absolute inset-0 bg-linear-to-t from-base-950/65 via-transparent to-base-950/10" />
              <div className="absolute start-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/90 px-3 py-1.5 text-xs font-semibold text-base-900 shadow-sm backdrop-blur">
                <span className="inline-flex text-sm text-primary">
                  <MaterialIcon name="verified" />
                </span>
                {isAr ? 'رعاية موثوقة ومخصصة لطفلك' : 'Trusted, personal care'}
              </div>
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/35 bg-white/90 p-4 shadow-lg backdrop-blur-md sm:inset-x-5 sm:bottom-5 sm:p-5">
                <p className="text-xs font-bold tracking-wide text-primary">
                  {isAr ? 'في كل مرحلة من النمو' : 'Every step of the way'}
                </p>
                <p className="mt-1 text-lg font-bold text-base-900 sm:text-xl">
                  {isAr
                    ? 'من أول يوم… رعاية تطمئن الأسرة'
                    : 'From day one, care that reassures'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {isAr
                    ? 'متابعة الطفل ودعم الوالدين في مكان واحد.'
                    : 'Child health and parent support, together.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {CARE_PILLARS.map((pillar) => (
              <div
                className="rounded-xl border border-primary/10 bg-background/85 transition-colors hover:bg-background"
                key={pillar.icon}
              >
                <Card>
                  <CardContent>
                    <div className="flex h-full items-start gap-3 p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <MaterialIcon name={pillar.icon} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold">
                          {isAr ? pillar.titleAr : pillar.titleEn}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {isAr ? pillar.descAr : pillar.descEn}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 Services Grid (max-w-6xl px-4 sm:px-6 lg:px-8) */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {isAr
                ? 'الخدمات الطبية بالعيادة'
                : 'Pediatric & Lactation Services'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr
                ? 'خدمات متخصصة لحديثي الولادة والرضع والأطفال في الغردقة.'
                : 'Specialized outpatient care for newborns, infants, and children in Hurghada.'}
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-primary hover:underline"
            search={langSearch}
            to="/services"
          >
            {isAr ? 'تفاصيل جميع الخدمات ←' : 'View full service details →'}
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SIX_CLINIC_SERVICES.map((service) => (
            <div
              className="flex flex-col justify-between rounded-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              key={service.id}
            >
              <Card>
                <CardHeader>
                  <div className="space-y-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MaterialIcon name={service.icon} />
                    </span>
                    <CardTitle>
                      <span className="text-lg">
                        {isAr ? service.titleAr : service.titleEn}
                      </span>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {isAr ? service.descAr : service.descEn}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Parent Series / Educational Callout */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-muted/50 p-6 sm:p-8 md:flex-row md:items-center">
          <div className="space-y-1.5">
            <p className="text-xs font-bold tracking-wider text-primary uppercase">
              {isAr
                ? 'د. حازم | طب الأطفال والرضاعة'
                : 'Parent Education & Guidance'}
            </p>
            <h3 className="text-xl font-bold">
              {isAr
                ? 'إجابات موثوقة عن الرضاعة الطبيعية والعناية بالرضيع'
                : 'Clear Guidance on Newborn Care & Breastfeeding'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isAr
                ? 'تجنب العادات الشائعة غير الآمنة للرضع، وفهم إشارات الجوع والنمو بثقة.'
                : 'Practical answers on infant feeding cues, growth expectations, and safe newborn care.'}
            </p>
          </div>
          <Link search={langSearch} to="/contact">
            <Button size="lg">
              {isAr ? 'تواصل مع العيادة' : 'Contact the Clinic'}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export const Route = createFileRoute('/_public/')({
  beforeLoad: async () => {
    try {
      const session = await authClient.getSession();

      if (session.data?.user) {
        // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router requires throwing redirect() from beforeLoad.
        throw redirect({ to: '/dashboard', replace: true });
      }
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
    }
  },
  head: () => ({
    meta: [
      {
        title:
          'د. حازم علي — عيادة طب الأطفال والرضاعة الطبيعية بالغردقة | Dr. Hazem Ali Pediatric & IBCLC',
      },
    ],
  }),
  component: PublicLandingPage,
});
