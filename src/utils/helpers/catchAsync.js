// utils/catchAsync.js
// @ts-nocheck
/**
 * Lightweight async wrapper for Express route handlers.
 * - Captures unexpected errors with Sentry
 * - Forwards the error to the next() middleware so your global error handler can respond
 *
 * Usage:
 * import { catchAsync } from '../utils/catchAsync.js';
 * export const login = catchAsync(async (req, res) => { ... });
 */

import Sentry from '../config/sentry.js'; // adjust path to your Sentry config

export const catchAsync = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(err => {
    try {
      // Attach some common context for debugging (optional)
      if (req) {
        Sentry.setContext('request', {
          method: req.method,
          url: req.originalUrl || req.url,
          ip: req.ip,
          params: req.params,
          query: req.query,
        });
        // If user/admin is available on the request, attach id (do not include PII)
        if (req.user?.id) Sentry.setUser({ id: String(req.user.id) });
        if (req.admin?._id) Sentry.setUser({ id: String(req.admin._id) });
      }
    } catch (ctxErr) {
      // If for any reason Sentry.setContext/setUser throws, swallow — we still want to report original error.
      // (Sentry methods are generally safe but guard just in case.)
      // eslint-disable-next-line no-console
      console.warn('Sentry context attach failed', ctxErr);
    }

    try {
      Sentry.captureException(err);
    } catch (captureErr) {
      // eslint-disable-next-line no-console
      console.warn('Sentry capture failed', captureErr);
    }

    // Pass to express error handler
    return next(err);
  });
};

export default catchAsync;
