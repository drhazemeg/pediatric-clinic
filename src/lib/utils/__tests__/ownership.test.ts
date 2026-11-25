import { describe, expect, it } from 'bun:test';

import { AppServerError } from '#/server/fn-errors';

import { assertOwnership } from '../ownership';

describe('assertOwnership', () => {
  const userId = 'user-123';

  it('throws NOT_FOUND when row is null or undefined', () => {
    for (const row of [null, undefined]) {
      try {
        assertOwnership(row, userId);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppServerError);

        if (!(error instanceof AppServerError)) {
          throw new TypeError('Expected AppServerError', { cause: error });
        }

        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe('Resource not found');
      }
    }
  });

  it('uses the supplied resource name in NOT_FOUND errors', () => {
    try {
      assertOwnership(null, userId, 'Question');
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppServerError);

      if (!(error instanceof AppServerError)) {
        throw new TypeError('Expected AppServerError', { cause: error });
      }

      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Question not found');
    }
  });

  it('throws FORBIDDEN when the creator does not match', () => {
    for (const creatorUserId of ['other-user', null]) {
      try {
        assertOwnership({ creatorUserId }, userId);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppServerError);

        if (!(error instanceof AppServerError)) {
          throw new TypeError('Expected AppServerError', { cause: error });
        }

        expect(error.code).toBe('FORBIDDEN');
      }
    }
  });

  it('does not throw when creatorUserId matches userId', () => {
    expect(() =>
      assertOwnership({ creatorUserId: userId }, userId),
    ).not.toThrow();
  });
});
