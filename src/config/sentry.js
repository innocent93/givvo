// import * as Sentry from '@sentry/node';
// import '@sentry/tracing';

// export const initSentry = () => {
//   Sentry.init({
//     dsn: process.env.SENTRY_DSN, // Add your DSN in .env
//     tracesSampleRate: 1.0, // Adjust for production
//     environment: process.env.NODE_ENV || 'development',
//   });
// };

// export default Sentry;

import * as Sentry from '@sentry/node';
import '@sentry/tracing'; // optional for traces

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
