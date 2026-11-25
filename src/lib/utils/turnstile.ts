// src/lib/utils/turnstile.ts (or wherever validateTurnstileToken lives)
import { env } from "@/env/server";
import { AppServerError } from "@/server/fn-errors";
import { logger } from "@/server/logger";

export async function validateTurnstileToken(
	token: string | undefined
): Promise<void> {
	if (env.TURNSTILE_DISABLED) return;

	const secretKey = env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
	const isDev = env.NODE_ENV !== "production";

	if (isDev && !secretKey) return;

	if (!secretKey) {
		throw new AppServerError(
			"BAD_REQUEST",
			"CAPTCHA is not configured. Set CLOUDFLARE_TURNSTILE_SECRET_KEY.",
			500
		);
	}

	if (!token) {
		throw new AppServerError(
			"BAD_REQUEST",
			"CAPTCHA verification is required.",
			400
		);
	}

	let res: Response;
	try {
		res = await fetch(
			"https://challenges.cloudflare.com/turnstile/v1/siteverify",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ secret: secretKey, response: token })
			}
		);
	} catch (err) {
		logger.error("[TURNSTILE] Network request to Cloudflare failed", {
			error: err instanceof Error ? err.message : String(err)
		});
		if (isDev) return;
		throw new AppServerError(
			"BAD_REQUEST",
			"CAPTCHA verification service temporarily unavailable.",
			503
		);
	}

	const text = await res.text();

	let data: { success: boolean; "error-codes"?: string[] };
	try {
		data = JSON.parse(text) as { success: boolean; "error-codes"?: string[] };
	} catch {
		logger.error("[TURNSTILE] Cloudflare returned invalid JSON", {
			status: res.status,
			body: text.slice(0, 500)
		});
		if (isDev) return;
		throw new AppServerError(
			"BAD_REQUEST",
			"CAPTCHA verification failed. Please try again.",
			400
		);
	}

	if (!data.success) {
		logger.warn("[TURNSTILE] Token verification failed", {
			errorCodes: data["error-codes"]
		});
		throw new AppServerError(
			"BAD_REQUEST",
			"CAPTCHA verification failed. Please try again.",
			400
		);
	}
}
