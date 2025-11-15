import Sentry from '../config/sentry.js';

export const catchAsync = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(err => {
    Sentry.captureException(err); // Automatically send error to Sentry
    next(err);
  });
};
