import type { ReactNode } from 'react';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { deserialize, serialize } from 'superjson';
import { z } from 'zod';

const QUERY_STALE_TIME = 30_000;
const QUERY_GC_TIME = 5 * 60_000;
const QUERY_RETRY_COUNT = 3;

const queryErrorSchema = z.object({
  code: z.string().optional(),
  status: z.number().optional(),
});

interface QueryErrorMetadata {
  readonly error: Error;
  readonly keySummary: string;
}

const getErrorDetails = (error: Error) => {
  const parsed = queryErrorSchema.safeParse(error);

  return parsed.success ? parsed.data : {};
};

const isAuthError = (error: Error): boolean => {
  const { code, status } = getErrorDetails(error);

  return (
    code === 'UNAUTHENTICATED' ||
    code === 'UNAUTHORIZED' ||
    code === 'FORBIDDEN' ||
    status === 401 ||
    status === 403
  );
};

const shouldRetryQuery = (failureCount: number, error: Error): boolean => {
  if (isAuthError(error)) {
    return false;
  }

  const { status } = getErrorDetails(error);

  if (
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  ) {
    return false;
  }

  return failureCount < QUERY_RETRY_COUNT;
};

const reportQueryError = (message: string, metadata: QueryErrorMetadata) => {
  const error = new Error(message);
  Object.assign(error, { metadata });

  if ('reportError' in globalThis) {
    globalThis.reportError(error);

    return;
  }

  console.error(message, metadata);
};

export function getContext() {
  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      dehydrate: { serializeData: serialize },
      hydrate: { deserializeData: deserialize },
      mutations: { retry: false },
      queries: {
        staleTime: QUERY_STALE_TIME,
        gcTime: QUERY_GC_TIME,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.skipGlobalError === true || isAuthError(error)) {
          return;
        }

        reportQueryError('[Query Error]', {
          error,
          keySummary: JSON.stringify(query.queryKey),
        });

        if (typeof window === 'undefined') {
          return;
        }

        toast.error('Unable to load data', {
          description: error.message,
          action: {
            label: 'Retry',
            onClick: () => {
              // oxlint-disable-next-line promise/no-promise-in-callback -- Toast action callback triggers background query refetch
              queryClient
                .refetchQueries({
                  queryKey: query.queryKey,
                  exact: true,
                  type: 'all',
                })
                .catch(() => null);
            },
          },
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (isAuthError(error)) {
          return;
        }

        const { status } = getErrorDetails(error);

        if (status !== undefined && status >= 400 && status < 500) {
          return;
        }

        reportQueryError('[Mutation Error]', {
          error,
          keySummary: JSON.stringify(mutation.options.mutationKey ?? []),
        });
      },
    }),
  });

  return { queryClient };
}

export type AppContext = ReturnType<typeof getContext>;

export default function TanstackQueryProvider({
  children,
  context,
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
