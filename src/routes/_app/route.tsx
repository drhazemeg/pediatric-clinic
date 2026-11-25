// apps/web/src/routes/_app/route.tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useHydrateActiveClinic } from "@/hooks/use-active-clinic";
import { authClient } from "@/lib/auth-client";
import { routeShell } from "@/lib/web/route-shell";

export const Route = createFileRoute("/_app")({
	staticData: routeShell.app,
	beforeLoad: async ({ location }) => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({
				to: "/login",
				search: {
					lang: "ar",
					redirectTo: location.pathname
				}
			});
		}
		const clinicId =
			(session.data.user as { clinicId?: string }).clinicId ?? "";
		return { session, clinicId };
	},
	component: AppLayoutComponent
});

function AppLayoutComponent() {
	const { clinicId } = Route.useRouteContext();
	useHydrateActiveClinic(clinicId ? { clinicId, clinicName: "" } : null);
	return <Outlet />;
}
