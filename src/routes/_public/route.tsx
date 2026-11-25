// apps/web/src/routes/_public.tsx

import { Link, Outlet, createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/material-icon';
import { CLINIC_BRAND } from '@/lib/web/constants';
import { routeShell } from '@/lib/web/route-shell';

const CURRENT_YEAR = new Date().getFullYear();

export const publicSearchSchema = z.object({
  lang: z.enum(['ar', 'en']).catch('ar').default('ar'),
});

export type PublicSearchParams = z.infer<typeof publicSearchSchema>;

interface NavItem {
  to: '/' | '/services' | '/contact';
  label: string;
}

const PublicFooter = ({
  isAr,
  langSearch,
}: {
  isAr: boolean;
  langSearch: { lang: 'ar' | 'en' };
}) => (
  <footer className="border-t border-border bg-muted/30">
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-base font-bold">
            {isAr ? CLINIC_BRAND.brandTitleAr : CLINIC_BRAND.brandTitleEn}
          </p>
          <p className="text-sm text-muted-foreground">
            {isAr ? CLINIC_BRAND.credentialsAr : CLINIC_BRAND.credentialsEn}
          </p>
          <p className="text-xs text-muted-foreground">
            {isAr ? CLINIC_BRAND.cityAr : CLINIC_BRAND.cityEn}
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold">
            {isAr ? 'روابط سريعة' : 'Quick Links'}
          </p>
          <div className="flex flex-col gap-1.5">
            <Link
              className="text-muted-foreground hover:text-foreground"
              search={langSearch}
              to="/"
            >
              {isAr ? 'الصفحة الرئيسية' : 'Overview'}
            </Link>
            <Link
              className="text-muted-foreground hover:text-foreground"
              search={langSearch}
              to="/services"
            >
              {isAr
                ? 'الخدمات الطبية والرضاعة'
                : 'Clinical & Lactation Services'}
            </Link>
            <Link
              className="text-muted-foreground hover:text-foreground"
              search={langSearch}
              to="/contact"
            >
              {isAr ? 'مواعيد العمل وحجز الكشف' : 'Hours & Appointments'}
            </Link>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold">
            {isAr ? 'تنويه طبي' : 'Medical Notice'}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {isAr
              ? 'المعلومات المنشورة للأغراض التوعوية للوالدين ولا تغني عن الفحص السريري المباشر. في حالات الطوارئ التنفسية أو ارتفاع الحرارة الشديد لدى الرضع يُرجى التوجه لأقرب قسم طوارئ فوراً.'
              : 'Published content is for parental education and does not replace in-person pediatric evaluation. For acute respiratory distress or high fever in young infants, seek urgent emergency care immediately.'}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
        <span>
          © {CURRENT_YEAR}{' '}
          {isAr ? CLINIC_BRAND.doctorNameAr : CLINIC_BRAND.doctorNameEn}
        </span>
        <span>{isAr ? CLINIC_BRAND.cityAr : CLINIC_BRAND.cityEn}</span>
      </div>
    </div>
  </footer>
);

const PublicLayoutComponent = () => {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAr = search.lang === 'ar';
  const langSearch = useMemo(() => ({ lang: search.lang }), [search.lang]);

  const setLanguage = (lang: 'ar' | 'en') => {
    void navigate({
      search: (prev) => ({ ...prev, lang }),
      replace: true,
    });
    setMobileMenuOpen(false);
  };

  const navItems: Array<NavItem> = [
    {
      to: '/',
      label: isAr ? 'الرئيسية' : 'Home',
    },
    {
      to: '/services',
      label: isAr ? 'الخدمات الطبية' : 'Services',
    },
    {
      to: '/contact',
      label: isAr ? 'التواصل والموقع' : 'Contact & Location',
    },
  ];

  return (
    <div
      className="flex min-h-screen flex-col bg-background text-foreground"
      dir={isAr ? 'rtl' : 'ltr'}
      lang={search.lang}
    >
      {/* Top Public Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            className="flex items-center gap-2.5 text-start"
            search={langSearch}
            to="/"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MaterialIcon name="pediatrics" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold">
                {isAr ? CLINIC_BRAND.brandTitleAr : CLINIC_BRAND.brandTitleEn}
              </p>
              <p className="text-xs text-muted-foreground">
                {isAr ? CLINIC_BRAND.cityAr : CLINIC_BRAND.cityEn}
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:font-semibold [&.active]:text-primary"
                key={item.to}
                search={langSearch}
                to={item.to}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions: Language Switcher + Staff Portal */}
          <div className="hidden items-center gap-2 md:flex">
            <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
              <button
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  isAr
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setLanguage('ar')}
                type="button"
              >
                العربية
              </button>
              <button
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  isAr
                    ? 'text-muted-foreground hover:text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
                onClick={() => setLanguage('en')}
                type="button"
              >
                EN
              </button>
            </div>

            <Link search={langSearch} to="/login">
              <Button size="sm" variant="outline">
                <span className="me-1.5 inline-flex text-sm">
                  <MaterialIcon name="login" />
                </span>
                {isAr ? 'دخول العيادة' : 'Clinic Portal'}
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            aria-expanded={mobileMenuOpen}
            aria-label={isAr ? 'فتح القائمة' : 'Toggle menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            type="button"
          >
            <MaterialIcon name={mobileMenuOpen ? 'close' : 'menu'} />
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-border bg-background md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
              {navItems.map((item) => (
                <Link
                  className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                  key={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  search={langSearch}
                  to={item.to}
                >
                  {item.label}
                </Link>
              ))}

              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="flex gap-1.5">
                  <Button
                    onClick={() => setLanguage('ar')}
                    size="sm"
                    type="button"
                    variant={isAr ? 'default' : 'outline'}
                  >
                    العربية
                  </Button>
                  <Button
                    onClick={() => setLanguage('en')}
                    size="sm"
                    type="button"
                    variant={isAr ? 'outline' : 'default'}
                  >
                    English
                  </Button>
                </div>

                <Link
                  onClick={() => setMobileMenuOpen(false)}
                  search={langSearch}
                  to="/login"
                >
                  <Button size="sm" variant="secondary">
                    {isAr ? 'دخول العيادة' : 'Staff Login'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1" id="main-content">
        <Outlet />
      </main>

      <PublicFooter isAr={isAr} langSearch={langSearch} />
    </div>
  );
};

export const Route = createFileRoute('/_public')({
  staticData: routeShell.public,
  validateSearch: publicSearchSchema,
  component: PublicLayoutComponent,
});
