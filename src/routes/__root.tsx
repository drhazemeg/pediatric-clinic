import type { RouteShell } from '#/lib/web/route-shell.ts';
import type { QueryClient } from '@tanstack/react-query';

// apps/web/src/routes/__root.tsx
import { TanStackDevtools } from '@tanstack/react-devtools';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { useMemo } from 'react';
import { z } from 'zod';

import { Sidebar } from '#/components/sidebar.tsx';
import { ThemeProvider } from '#/components/theme-provider.tsx';
import { AnnouncementBanner } from '#/components/ui/announcement-banner.tsx';
import { Toaster } from '#/components/ui/sonner.tsx';
import { useSidebar } from '#/hooks/use-sidebar.ts';
import {
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  SITE_NAME,
  SITE_URL,
  buildSocialMeta,
} from '#/lib/site-seo.ts';
import { images } from '#/lib/web/app-images.ts';
import { AppModeProvider } from '#/lib/web/app-mode.tsx';
import { TooltipProvider } from '@/components/ui/tooltip';

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools';

import appCss from '../styles.css?url';

const THEME_COLOR_LIGHT: `#${string}` = '#f4f6fa';
const THEME_COLOR_DARK: `#${string}` = '#0e1524';
const DEVTOOLS_CONFIG = { position: 'bottom-right' } as const;

const routeShellSchema = z.enum(['app', 'public', 'fullscreen']);
const routeShellWrapperSchema = z.object({ shell: routeShellSchema });

interface MyRouterContext {
  queryClient: QueryClient;
}

const SkipLink = () => (
  <a
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-background focus:shadow-xl"
    href="#main-content"
  >
    الانتقال إلى المحتوى الرئيسي / Skip to main content
  </a>
);

const resolveShell = (
  matches: ReadonlyArray<{ staticData?: unknown }>,
): RouteShell => {
  for (const match of matches.toReversed()) {
    const direct = routeShellSchema.safeParse(match.staticData);

    if (direct.success) {
      return direct.data;
    }

    const wrapped = routeShellWrapperSchema.safeParse(match.staticData);

    if (wrapped.success) {
      return wrapped.data.shell;
    }
  }

  return 'app';
};

const RootDocument = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <HeadContent />
    </head>
    <body>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
        enableSystem
        storageKey="smart-clinic-theme"
      >
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
      <Scripts />
    </body>
  </html>
);

const RootShellBody = ({
  shell,
  collapsed,
}: {
  shell: RouteShell;
  collapsed: boolean;
}) => {
  if (shell === 'fullscreen') {
    return (
      <div className="relative flex h-screen flex-col overflow-y-auto bg-background text-foreground">
        <Outlet />
      </div>
    );
  }

  if (shell === 'public') {
    return (
      <div className="relative min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <SkipLink />
      <Sidebar />
      <main
        className={`relative z-0 min-h-screen transition-all duration-300 ${
          collapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
        id="main-content"
      >
        <Outlet />
      </main>
    </div>
  );
};

const RootComponent = () => {
  const { collapsed } = useSidebar();
  const matches = useRouterState({ select: (s) => s.matches });
  const shell = useMemo(() => resolveShell(matches), [matches]);

  const devtoolsPlugins = useMemo(
    () => [
      {
        name: 'TanStack Router',
        render: <TanStackRouterDevtoolsPanel />,
      },
      TanStackQueryDevtools,
    ],
    [],
  );

  return (
    <AppModeProvider>
      <AnnouncementBanner />
      <RootShellBody collapsed={collapsed} shell={shell} />
      <Toaster richColors />
      {import.meta.env.DEV && (
        <TanStackDevtools config={DEVTOOLS_CONFIG} plugins={devtoolsPlugins} />
      )}
    </AppModeProvider>
  );
};

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: DEFAULT_SITE_TITLE },
      { name: 'description', content: DEFAULT_SITE_DESCRIPTION },
      ...buildSocialMeta(),
      { name: 'robots', content: 'index, follow' },
      {
        name: 'theme-color',
        content: THEME_COLOR_LIGHT,
        media: '(prefers-color-scheme: light)',
      },
      {
        name: 'theme-color',
        content: THEME_COLOR_DARK,
        media: '(prefers-color-scheme: dark)',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: images.logo.src },
      { rel: 'canonical', href: `${SITE_URL}/` },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous' as const,
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL,GRAD,opsz,wght@0..1,-50..200,20..48,100..700&display=block',
      },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'MedicalClinic',
          name: SITE_NAME,
          url: SITE_URL,
          description: DEFAULT_SITE_DESCRIPTION,
          areaServed: 'Hurghada, Red Sea Governorate, Egypt',
        }),
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});
