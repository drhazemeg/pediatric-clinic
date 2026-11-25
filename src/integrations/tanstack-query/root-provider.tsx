import {
	MutationCache,
	QueryCache,
	QueryClient,
	QueryClientProvider
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import superjson from "superjson";

const QUERY_STALE_TIME = 30_000;
const QUERY_GC_TIME = 5 * 60_000;
const QUERY_RETRY_COUNT = 3;

function getErrorDetails(error: Error) {
	const details = error as Error & { code?: string; status?: number };
	return { code: details.code, status: details.status };
}

function isAuthError(error: Error): boolean {
	const { code, status } = getErrorDetails(error);
	return (
		code === "UNAUTHENTICATED" ||
		code === "UNAUTHORIZED" ||
		code === "FORBIDDEN" ||
		status === 401 ||
		status === 403
	);
}

function shouldRetryQuery(failureCount: number, error: Error): boolean {
	if (isAuthError(error)) return false;

	const { status } = getErrorDetails(error);
	if (
		typeof status === "number" &&
		status >= 400 &&
		status < 500 &&
		status !== 408 &&
		status !== 429
	) {
		return false;
	}

	return failureCount < QUERY_RETRY_COUNT;
}

function reportQueryError(message: string, metadata: Record<string, unknown>) {
	const error = new Error(message);
	Object.assign(error, { metadata });

	if (typeof globalThis.reportError === "function") {
		globalThis.reportError(error);
		return;
	}

	console.error(message, metadata);
}

export function getContext() {
	let queryClient!: QueryClient;

	queryClient = new QueryClient({
		defaultOptions: {
			dehydrate: { serializeData: superjson.serialize },
			hydrate: { deserializeData: superjson.deserialize },
			mutations: { retry: false },
			queries: {
				staleTime: QUERY_STALE_TIME,
				gcTime: QUERY_GC_TIME,
				refetchOnReconnect: true,
				refetchOnWindowFocus: false,
				retry: shouldRetryQuery
			}
		},
		queryCache: new QueryCache({
			onError: (error, query) => {
				if (query.meta?.skipGlobalError === true || isAuthError(error)) return;

				reportQueryError("[Query Error]", {
					error,
					queryKey: query.queryKey
				});
				if (typeof window === "undefined") return;

				toast.error("Unable to load data", {
					description: error.message,
					action: {
						label: "Retry",
						onClick: () => {
							void queryClient.refetchQueries({
								queryKey: query.queryKey,
								exact: true,
								type: "all"
							});
						}
					}
				});
			}
		}),
		mutationCache: new MutationCache({
			onError: (error, _variables, _context, mutation) => {
				if (isAuthError(error)) return;
				const { status } = getErrorDetails(error);
				if (typeof status === "number" && status >= 400 && status < 500) {
					return;
				}

				reportQueryError("[Mutation Error]", {
					error,
					mutationKey: mutation.options.mutationKey
				});
			}
		})
	});

	return { queryClient };
}

export type AppContext = ReturnType<typeof getContext>;

export default function TanstackQueryProvider({
	children,
	context
}: {
	children: ReactNode;
	context: AppContext;
}) {
	return (
		<QueryClientProvider client={context.queryClient}>
			{children}
		</QueryClientProvider>
	);
}
