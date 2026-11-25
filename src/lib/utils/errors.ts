import { AppServerError } from '#/server/fn-errors';

export function throwUnauthorized(message = 'Unauthorized'): never {
  throw new AppServerError('UNAUTHENTICATED', message, 401);
}

export function throwForbidden(message = 'Forbidden'): never {
  throw new AppServerError('FORBIDDEN', message, 403);
}

export function throwNotFound(resource = 'Resource'): never {
  throw new AppServerError('NOT_FOUND', `${resource} not found`, 404);
}

export function throwBadRequest(message = 'Bad request'): never {
  throw new AppServerError('BAD_REQUEST', message, 400);
}

export function throwInternal(message = 'Internal server error'): never {
  throw new AppServerError('INTERNAL_SERVER_ERROR', message, 500);
}
