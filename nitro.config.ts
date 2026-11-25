// server/plugins/request-logger.ts
import { definePlugin } from "nitro";
import { logger } from "@/server/logger";

export default definePlugin((nitroApp) => {
	// Store start time on the event's internal context via the request hook
	nitroApp.hooks.hook("request", (event) => {
		// Nitro v3: event.req.context is where you stash per-request state
		(event.req as { context?: Record<string, unknown> }).context ??= {};
		(event.req as { context: Record<string, unknown> }).context._start =
			Date.now();
	});

	// "response" runs after the response is created — this is the v3 hook name
	nitroApp.hooks.hook("response", (res, event) => {
		const ctx = (event.req as { context?: { _start?: number } }).context;
		const start = ctx?._start;
		logger.info({
			action: "request",
			method: event.req.method,
			path: event.req.url,
			status: res.status,
			durationMs: start ? Date.now() - start : undefined
		});
	});
});