import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import winston from "winston";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const isProduction = process.env.NODE_ENV === "production";
const logDir = process.env.LOG_DIR
	? path.resolve(process.env.LOG_DIR)
	: path.resolve(process.cwd(), "logs");

/**
 * Unwraps nested AggregateError items and Error causes so connection/queue
 * failures log actionable underlying messages instead of a bare "AggregateError".
 */
const unwrapAggregateErrors = winston.format(info => {
	const err = info instanceof Error ? info : (info.error ?? info);
	if (err && typeof err === "object") {
		const candidate = err as {
			errors?: unknown[];
			cause?: unknown;
			code?: unknown;
		};

		if (Array.isArray(candidate.errors) && candidate.errors.length > 0) {
			const nested = candidate.errors.map(item => {
				if (item instanceof Error) {
					const code =
						"code" in item && item.code ? ` (${String(item.code)})` : "";
					return `${item.name}: ${item.message}${code}`;
				}
				return String(item);
			});
			info.aggregateErrors = nested;
			if (
				typeof info.message === "string" &&
				info.message.endsWith("AggregateError")
			) {
				info.message = `${info.message}: ${nested.join("; ")}`;
			}
		}

		if (candidate.cause && !info.cause) {
			info.cause =
				candidate.cause instanceof Error
					? `${candidate.cause.name}: ${candidate.cause.message}`
					: String(candidate.cause);
		}
	}
	return info;
});

const devFormat = printf(
	({ level, message, timestamp: ts, stack, reqId, ...metadata }) => {
		const prefix = reqId ? `[${String(reqId)}] ` : "";
		const hasMeta = Object.keys(metadata).length > 0;
		let msg = `${String(ts)} [${level}]: ${prefix}${String(message)}`;
		if (hasMeta) {
			msg += ` ${JSON.stringify(metadata)}`;
		}
		if (stack) {
			msg += `\n${String(stack)}`;
		}
		return msg;
	}
);

function ensureLogDir(): string | null {
	try {
		if (!existsSync(logDir)) {
			mkdirSync(logDir, { recursive: true });
		}
		return logDir;
	} catch (err) {
		process.stderr.write(
			`Failed to create log directory "${logDir}": ${String(err)}\n`
		);
		return null;
	}
}

function createTransports(): winston.transport[] {
	const transports: winston.transport[] = [];
	const baseFormat = combine(
		unwrapAggregateErrors(),
		errors({ stack: true }),
		timestamp()
	);

	if (isProduction) {
		const resolvedDir = ensureLogDir();
		if (resolvedDir) {
			transports.push(
				new winston.transports.File({
					filename: path.join(resolvedDir, "smart-error.log"),
					level: "error",
					format: combine(baseFormat, json()),
					maxsize: 10 * 1024 * 1024,
					maxFiles: 14
				}),
				new winston.transports.File({
					filename: path.join(resolvedDir, "smart-combined.log"),
					format: combine(baseFormat, json()),
					maxsize: 10 * 1024 * 1024,
					maxFiles: 7
				})
			);
		}
	}

	transports.push(
		new winston.transports.Console({
			format: isProduction
				? combine(baseFormat, json())
				: combine(
						colorize(),
						unwrapAggregateErrors(),
						errors({ stack: true }),
						timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
						devFormat
					)
		})
	);

	return transports;
}

export const logger = winston.createLogger({
	level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
	defaultMeta: { service: "smart-api" },
	transports: createTransports()
});

export function withRequestId(reqId: string) {
	return logger.child({ reqId });
}

export function withContext(context: Record<string, unknown>) {
	return logger.child(context);
}
