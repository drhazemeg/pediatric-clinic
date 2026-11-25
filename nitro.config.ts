// server/plugins/request-logger.ts
import { definePlugin } from 'nitro';

import { logger } from '@/server/logger';

const requestStartTimes = new WeakMap<object, number>();

export default definePlugin((nitroApp) => {
  // Store start time per request without mutating event.req
  nitroApp.hooks.hook('request', (event) => {
    requestStartTimes.set(event.req, Date.now());
  });

  // "response" runs after the response is created — this is the v3 hook name
  nitroApp.hooks.hook('response', (res, event) => {
    const start = requestStartTimes.get(event.req);
    logger.info({
      action: 'request',
      method: event.req.method,
      path: event.req.url,
      status: res.status,
      durationMs: start === undefined ? undefined : Date.now() - start,
    });
  });
});
