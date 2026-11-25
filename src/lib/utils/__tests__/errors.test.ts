import { describe, expect, it } from 'bun:test';

import { AppServerError } from '#/server/fn-errors';

import {
  throwBadRequest,
  throwForbidden,
  throwInternal,
  throwNotFound,
  throwUnauthorized,
} from '../errors';

const expectThrowsAppServerError = (
  fn: () => never,
  code: AppServerError['code'],
  message: string,
) => {
  try {
    fn();
    expect.unreachable('Should have thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(AppServerError);

    if (!(error instanceof AppServerError)) {
      throw new TypeError('Expected AppServerError', { cause: error });
    }

    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
  }
};

describe('server error helpers', () => {
  it('throws UNAUTHENTICATED with default and custom messages', () => {
    expectThrowsAppServerError(
      throwUnauthorized,
      'UNAUTHENTICATED',
      'Unauthorized',
    );
    expectThrowsAppServerError(
      () => throwUnauthorized('Custom message'),
      'UNAUTHENTICATED',
      'Custom message',
    );
  });

  it('throws FORBIDDEN with default and custom messages', () => {
    expectThrowsAppServerError(throwForbidden, 'FORBIDDEN', 'Forbidden');
    expectThrowsAppServerError(
      () => throwForbidden('Access denied'),
      'FORBIDDEN',
      'Access denied',
    );
  });

  it('throws NOT_FOUND with default and custom resource messages', () => {
    expectThrowsAppServerError(
      throwNotFound,
      'NOT_FOUND',
      'Resource not found',
    );
    expectThrowsAppServerError(
      () => throwNotFound('Question'),
      'NOT_FOUND',
      'Question not found',
    );
  });

  it('throws BAD_REQUEST with default and custom messages', () => {
    expectThrowsAppServerError(throwBadRequest, 'BAD_REQUEST', 'Bad request');
    expectThrowsAppServerError(
      () => throwBadRequest('Invalid input'),
      'BAD_REQUEST',
      'Invalid input',
    );
  });

  it('throws INTERNAL_SERVER_ERROR with default and custom messages', () => {
    expectThrowsAppServerError(
      throwInternal,
      'INTERNAL_SERVER_ERROR',
      'Internal server error',
    );
    expectThrowsAppServerError(
      () => throwInternal('DB connection failed'),
      'INTERNAL_SERVER_ERROR',
      'DB connection failed',
    );
  });
});
