// apps/web/src/routes/_auth/login.tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import SignInForm from '@/components/sign-in-form';
import { images } from '@/lib/web/app-images';
import { routeShell } from '@/lib/web/route-shell';

export const authSearchSchema = z.object({
  lang: z.enum(['ar', 'en']).catch('ar').default('ar'),
  redirectTo: z.string().optional(),
});

export type AuthSearchParams = z.infer<typeof authSearchSchema>;

const RouteComponent = () => {
  // --- FIX 3: TypeScript now knows these exist ---
  const search = Route.useSearch();
  const isAr = search.lang === 'ar';

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-muted/30 px-4 py-8"
      dir={isAr ? 'rtl' : 'ltr'}
      lang={search.lang}
    >
      <div className="flex w-full max-w-md flex-col items-center">
        <img
          alt={
            isAr
              ? 'شعار عيادة د. حازم علي لطب الأطفال والرضاعة'
              : 'Dr. Hazem Ali Pediatric & Lactation Care Logo'
          }
          className="mb-6 h-24 w-auto object-contain"
          src={images.logo.src}
        />
        <SignInForm
          // These props are now correctly typed
          lang={search.lang}
          redirectTo={search.redirectTo}
        />
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_auth/login')({
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      {
        title: 'تسجيل الدخول — عيادة د. حازم علي | Smart Clinic Sign In',
      },
    ],
  }),
  staticData: routeShell.public,
  component: RouteComponent,
});
