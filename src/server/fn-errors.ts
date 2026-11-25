// src/server/fn-errors.ts
import { AppointmentConflictError } from '@/db/queries/appointments.queries';

export type AppServerErrorMeta = Record<
  string,
  string | number | boolean | null | undefined
>;

export class AppServerError extends Error {
  readonly code:
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'BAD_REQUEST'
    | 'TOO_MANY_REQUESTS'
    | 'INTERNAL_SERVER_ERROR';
  readonly status: number;
  readonly meta?: AppServerErrorMeta;

  constructor(
    code: AppServerError['code'],
    message: string,
    status: number,
    meta?: AppServerErrorMeta,
  ) {
    super(message);
    this.name = 'AppServerError';
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

export function toAppServerError(
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- universal catch boundary normalizer
  err: unknown,
  fallbackMessage: string,
): never {
  if (err instanceof AppServerError) {
    throw err;
  }

  if (err instanceof AppointmentConflictError) {
    throw new AppServerError('CONFLICT', err.message, 409, {
      conflictingAppointmentId: err.conflictingAppointmentId,
    });
  }

  if (err instanceof Error && /changed; reload it/iu.test(err.message)) {
    throw new AppServerError('CONFLICT', err.message, 409);
  }

  if (err instanceof Error && /not found/iu.test(err.message)) {
    throw new AppServerError('NOT_FOUND', err.message, 404);
  }

  throw new AppServerError('BAD_REQUEST', fallbackMessage, 400, {
    cause: err instanceof Error ? err.message : String(err),
  });
}
