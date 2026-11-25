import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import TanstackQueryProvider, {
	getContext
} from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

function WrapComponent({ children }: { children: React.ReactNode }) {
	const context = getContext();
	return (
		<TanstackQueryProvider context={context}>{children}</TanstackQueryProvider>
	);
}

export function getRouter() {
	const context = getContext();

	const router = createTanStackRouter({
		routeTree,
		context,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,

		Wrap: WrapComponent
	});

	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
