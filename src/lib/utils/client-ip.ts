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
	const headers = request.headers;

	const cfIp = headers.get("cf-connecting-ip");
	if (cfIp) return cfIp.trim();

	const forwarded = headers.get("x-forwarded-for");
	if (forwarded) {
		const firstIp = forwarded.split(",")[0]?.trim();
		if (firstIp) return firstIp;
	}

	const realIp = headers.get("x-real-ip");
	if (realIp) return realIp.trim();

	return undefined;
}
