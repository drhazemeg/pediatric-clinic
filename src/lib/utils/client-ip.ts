// apps/web/src/server/lib/client-ip.ts

/**
 * Resolve the caller's IP from a TanStack Start server-function request.
 *
 * Order of precedence:
 *   1. cf-connecting-ip      (Cloudflare)
 *   2. x-forwarded-for[0]    (standard proxy chain — leftmost is the client)
 *   3. x-real-ip             (nginx / some load balancers)
 *
 * Returns undefined when running outside a request scope or when the
 * incoming request has no forwarded headers.
 */
export function getClientIp(request: Request): string | undefined {
  const { headers } = request;

  const cfIp = headers.get('cf-connecting-ip');

  if (cfIp !== null && cfIp.trim().length > 0) {
    return cfIp.trim();
  }

  const forwarded = headers.get('x-forwarded-for');

  if (forwarded !== null && forwarded.length > 0) {
    const firstIp = forwarded.split(',').at(0)?.trim();

    if (firstIp !== undefined && firstIp.length > 0) {
      return firstIp;
    }
  }

  const realIp = headers.get('x-real-ip');

  if (realIp !== null && realIp.trim().length > 0) {
    return realIp.trim();
  }

  return undefined;
}
