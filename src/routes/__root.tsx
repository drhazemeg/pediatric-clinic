// apps/web/src/routes/__root.tsx
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useRouterState
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useMemo } from "react";
import { Sidebar } from "#/components/sidebar.tsx";
import { ThemeProvider } from "#/components/theme-provider.tsx";
import { AnnouncementBanner } from "#/components/ui/AnnouncementBanner.tsx";
import { Toaster } from "#/components/ui/sonner.tsx";
import { useSidebar } from "#/hooks/use-sidebar.ts";
import {
	buildSocialMeta,
	DEFAULT_SITE_DESCRIPTION,
	DEFAULT_SITE_TITLE,
	SITE_NAME,
	SITE_URL
} from "#/lib/site-seo.ts";
import { images } from "#/lib/web/app-images.ts";
import { AppModeProvider } from "#/lib/web/app-mode.tsx";
import type { RouteShell } from "#/lib/web/route-shell.ts";
import { TooltipProvider } from "@/components/ui/tooltip";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

const APP = {
	themeColor: {
		light: "#f4f6fa" as `#${string}`,
		dark: "#0e1524" as `#${string}`
	}
} as const;

const VALID_SHELLS = new Set<RouteShell>(["app", "public", "fullscreen"]);

interface MyRouterContext {
	queryClient: QueryClient;
}

function SkipLink() {
	return (
		<a
			className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-[var(--radius-lg)] focus:bg-[var(--clay-black)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--pure-white)] focus:shadow-xl'
			href='#main-content'
		>
			الانتقال إلى المحتوى الرئيسي / Skip to main content
		</a>
	);
}

function resolveShell(
	matches: ReadonlyArray<{ staticData?: unknown }>
): RouteShell {
	for (let i = matches.length - 1; i >= 0; i--) {
		const data = matches[i]?.staticData;
		if (typeof data === "string" && VALID_SHELLS.has(data as RouteShell)) {
			return data as RouteShell;
		}
		if (data && typeof data === "object" && "shell" in data) {
			const nestedShell = (data as { shell?: unknown }).shell;
			if (
				typeof nestedShell === "string" &&
				VALID_SHELLS.has(nestedShell as RouteShell)
			) {
				return nestedShell as RouteShell;
			}
		}
	}
	return "app";
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: DEFAULT_SITE_TITLE },
			{ name: "description", content: DEFAULT_SITE_DESCRIPTION },
			...buildSocialMeta(),
			{ name: "robots", content: "index, follow" },
			{
				name: "theme-color",
				content: APP.themeColor.light,
				media: "(prefers-color-scheme: light)"
			},
			{
				name: "theme-color",
				content: APP.themeColor.dark,
				media: "(prefers-color-scheme: dark)"
			}
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: images.logo.src },
			{ rel: "canonical", href: `${SITE_URL}/` },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous" as const
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL,GRAD,opsz,wght@0..1,-50..200,20..48,100..700&display=block"
			}
		],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "MedicalClinic",
					name: SITE_NAME,
					url: SITE_URL,
					description: DEFAULT_SITE_DESCRIPTION,
					areaServed: "Hurghada, Red Sea Governorate, Egypt"
				})
			}
		]
	}),
	shellComponent: RootDocument,
	component: RootComponent
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang='en'
			suppressHydrationWarning
		>
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider
					attribute='class'
					defaultTheme='light'
					disableTransitionOnChange
					enableSystem
					storageKey='smart-clinic-theme'
				>
					<TooltipProvider>{children}</TooltipProvider>
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}

function RootComponent() {
	const { collapsed } = useSidebar();
	const matches = useRouterState({ select: s => s.matches });
	const shell = useMemo(() => resolveShell(matches), [matches]);

	return (
		<AppModeProvider>
			<AnnouncementBanner />
			{shell === "fullscreen" ? (
				<div className='bg-background text-on-surface relative flex h-screen flex-col overflow-y-auto'>
					<Outlet />
				</div>
			) : shell === "public" ? (
				<div className='bg-background text-on-surface relative min-h-screen'>
					<Outlet />
				</div>
			) : (
				<div className='bg-background relative min-h-screen'>
					<SkipLink />
					<Sidebar />
					<main
						className={`relative z-0 min-h-screen transition-all duration-300 ${
							collapsed ? "md:ml-16" : "md:ml-64"
						}`}
						id='main-content'
					>
						<Outlet />
					</main>
				</div>
			)}
			<Toaster richColors />
			{import.meta.env.DEV && (
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "TanStack Router",
							render: <TanStackRouterDevtoolsPanel />
						},
						TanStackQueryDevtools
					]}
				/>
			)}
		</AppModeProvider>
	);
}
