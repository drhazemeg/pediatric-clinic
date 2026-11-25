import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import winston from 'winston';
import { z } from 'zod';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

const logDir =
  process.env.LOG_DIR !== undefined && process.env.LOG_DIR !== ''
    ? path.resolve(process.env.LOG_DIR)
    : path.resolve(process.cwd(), 'logs');

const aggregateErrorCandidateSchema = z.object({
  errors: z.array(z.any()).optional(),
  cause: z.any().optional(),
});

const scalarLogValueSchema = z.union([z.string(), z.number()]);

/**
 * Unwraps nested AggregateError items and Error causes so connection/queue
 * failures log actionable underlying messages instead of a bare "AggregateError".
 */
const unwrapAggregateErrors = winston.format((info) => {
  const err = info instanceof Error ? info : (info.error ?? info);
  const parsed = aggregateErrorCandidateSchema.safeParse(err);

  if (parsed.success) {
    const candidate = parsed.data;

    if (candidate.errors !== undefined && candidate.errors.length > 0) {
      const nested = candidate.errors.map((item) => {
        if (item instanceof Error) {
          const parsedCode =
            'code' in item
              ? scalarLogValueSchema.safeParse(item.code)
              : { success: false as const };

          const code = parsedCode.success
            ? ` (${String(parsedCode.data)})`
            : '';

          return `${item.name}: ${item.message}${code}`;
        }

        return String(item);
      });

      info.aggregateErrors = nested;

      if (
        z.string().safeParse(info.message).success &&
        String(info.message).endsWith('AggregateError')
      ) {
        info.message = `${String(info.message)}: ${nested.join('; ')}`;
      }
    }

    if (candidate.cause !== undefined && info.cause === undefined) {
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
    const parsedReqId = scalarLogValueSchema.safeParse(reqId);

    const prefix =
      parsedReqId.success && parsedReqId.data !== ''
        ? `[${String(parsedReqId.data)}] `
        : '';

    const hasMeta = Object.keys(metadata).length > 0;
    let msg = `${String(ts)} [${level}]: ${prefix}${String(message)}`;

    if (hasMeta) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    const parsedStack = z.string().safeParse(stack);

    if (parsedStack.success && parsedStack.data !== '') {
      msg += `\n${parsedStack.data}`;
    }

    return msg;
  },
);

const ensureLogDir = (): string | null => {
  try {
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    return logDir;
  } catch (error) {
    process.stderr.write(
      `Failed to create log directory "${logDir}": ${String(error)}\n`,
    );

    return null;
  }
};

const createTransports = (): Array<winston.transport> => {
  const transports: Array<winston.transport> = [];

  const baseFormat = combine(
    unwrapAggregateErrors(),
    errors({ stack: true }),
    timestamp(),
  );

  if (isProduction) {
    const resolvedDir = ensureLogDir();

    if (resolvedDir !== null) {
      transports.push(
        new winston.transports.File({
          filename: path.join(resolvedDir, 'smart-error.log'),
          level: 'error',
          format: combine(baseFormat, json()),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 14,
        }),
        new winston.transports.File({
          filename: path.join(resolvedDir, 'smart-combined.log'),
          format: combine(baseFormat, json()),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 7,
        }),
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
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            devFormat,
          ),
    }),
  );

  return transports;
};

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
  defaultMeta: { service: 'smart-api' },
  transports: createTransports(),
});

export function withRequestId(reqId: string) {
  return logger.child({ reqId });
}

export function withContext(
  context: Record<string, string | number | boolean | null | undefined>,
) {
  return logger.child(context);
}
