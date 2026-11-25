// src/server/fn-errors.ts
import { AppointmentConflictError } from "@/db/queries/appointments.queries";

export class AppServerError extends Error {
	readonly code:
		| "UNAUTHENTICATED"
		| "FORBIDDEN"
		| "NOT_FOUND"
		| "CONFLICT"
		| "BAD_REQUEST"
		| "TOO_MANY_REQUESTS"
		| "INTERNAL_SERVER_ERROR";
	readonly status: number;
	readonly meta?: Record<string, unknown>;

	constructor(
		code: AppServerError["code"],
		message: string,
		status: number,
		meta?: Record<string, unknown>
	) {
		super(message);
		this.name = "AppServerError";
		this.code = code;
		this.status = status;
		this.meta = meta;
	}
}

export function toAppServerError(err: unknown, fallbackMessage: string): never {
	if (err instanceof AppServerError) {
		throw err;
	}
	if (err instanceof AppointmentConflictError) {
		throw new AppServerError("CONFLICT", err.message, 409, {
			conflictingAppointmentId: err.conflictingAppointmentId
		});
	}
	if (err instanceof Error && /changed; reload it/i.test(err.message)) {
		throw new AppServerError("CONFLICT", err.message, 409);
	}
	if (err instanceof Error && /not found/i.test(err.message)) {
		throw new AppServerError("NOT_FOUND", err.message, 404);
	}
	throw new AppServerError("BAD_REQUEST", fallbackMessage, 400, {
		cause: err instanceof Error ? err.message : String(err)
	});
}
