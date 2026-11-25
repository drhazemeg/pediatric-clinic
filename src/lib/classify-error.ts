import { z } from 'zod';

export type ErrorKind = 'not-found' | 'permission' | 'network' | 'unknown';

const rpcErrorSchema = z.object({
  status: z.number().optional(),
  code: z.string().optional(),
});

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- Error classifier intentionally accepts unknown caught values and validates via Zod.
export function classifyError(err: unknown): ErrorKind {
  const parsed = rpcErrorSchema.safeParse(err);
  const status = parsed.success ? parsed.data.status : undefined;
  const code = parsed.success ? parsed.data.code : undefined;

  if (status === 404 || code === 'NOT_FOUND') {
    return 'not-found';
  }

  if (status === 401 || status === 403 || code === 'FORBIDDEN') {
    return 'permission';
  }

  if (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    (err instanceof TypeError && /fetch|network/iu.test(err.message))
  ) {
    return 'network';
  }

  return 'unknown';
}
