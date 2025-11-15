// src/config/sentry.js
// Defensive Sentry config for ESM Node apps.
// - Use real DSN (no angle-brackets) in SENTRY_DSN env var.
// - Optional tracing: install @sentry/tracing if you want it, otherwise it's skipped.

import * as Sentry from '@sentry/node';

const {
  SENTRY_DSN,
  NODE_ENV = 'development',
  SENTRY_TRACES_SAMPLE_RATE = '0.0',
  SENTRY_ENVIRONMENT,
  SENTRY_RELEASE,
} = process.env;

// Helper: try dynamic import of @sentry/tracing without hard crash
let tracingIntegration = null;
try {
  // top-level await is supported because your app uses ESM
  // this will throw if @sentry/tracing is not installed — we catch below
  // eslint-disable-next-line no-await-in-loop
  const tracingModule = await import('@sentry/tracing').catch(() => null);
  if (
    tracingModule &&
    tracingModule.Integrations &&
    tracingModule.Integrations.Express
  ) {
    tracingIntegration = tracingModule.Integrations.Express;
  } else if (tracingModule && tracingModule.Express) {
    // older shape / fallbacks
    tracingIntegration = tracingModule.Express;
  } else {
    tracingIntegration = null;
  }
} catch (err) {
  tracingIntegration = null;
}

// Validate DSN quickly (avoid simple placeholder mistakes)
const isValidDsn = dsn => {
  if (!dsn || typeof dsn !== 'string') return false;
  if (dsn.includes('<') || dsn.includes('>')) return false; // common placeholder mistake
  // basic shape check
  return dsn.startsWith('http') && dsn.includes('sentry.io');
};

if (!SENTRY_DSN || !isValidDsn(SENTRY_DSN)) {
  // do NOT initialize Sentry when DSN invalid — avoid noisy errors
  // eslint-disable-next-line no-console
  console.warn(
    'SENTRY_DSN not set or invalid — Sentry disabled. Set a real DSN (no angle brackets).'
  );
} else {
  try {
    const initOptions = {
      dsn: SENTRY_DSN,
      environment: SENTRY_ENVIRONMENT || NODE_ENV,
      release: SENTRY_RELEASE || undefined,
      attachStacktrace: true,
      sendDefaultPii: false, // don't send PII unless you explicitly want to
      tracesSampleRate: Number(SENTRY_TRACES_SAMPLE_RATE) || 0,
      // beforeSend lets you inspect/modify events (and scrub headers) before they leave your app.
      beforeSend: (event, hint) => {
        try {
          if (event.request && event.request.headers) {
            // redact common sensitive headers
            if (event.request.headers.authorization) {
              event.request.headers.authorization = '[REDACTED]';
            }
            if (event.request.headers.cookie) {
              event.request.headers.cookie = '[REDACTED]';
            }
          }
        } catch (err) {
          // swallow scrubbing errors to avoid blocking event
        }
        return event;
      },
    };

    // Add tracing integration if available
    if (tracingIntegration) {
      initOptions.integrations = defaults => {
        try {
          return [...defaults, new tracingIntegration({})];
        } catch (_) {
          return defaults;
        }
      };
      // Ensure tracesSampleRate is set to a number > 0 to enable tracing
      initOptions.tracesSampleRate = Number(SENTRY_TRACES_SAMPLE_RATE) || 0;
    }

    Sentry.init(initOptions);
    // eslint-disable-next-line no-console
    console.info(
      'Sentry initialized',
      tracingIntegration ? '(with tracing)' : '(tracing disabled)'
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Sentry initialization failed:', err);
  }
}

/**
 * Flush Sentry events before shutdown
 */
export async function flushSentry(timeoutMs = 2000) {
  try {
    // @ts-ignore - flush exists on Sentry SDK
    if (Sentry && typeof Sentry.flush === 'function') {
      await Sentry.flush(Number(timeoutMs));
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Sentry flush failed', err);
  }
}

export default Sentry;

// import * as Sentry from '@sentry/node';
// import * as SentryTracing from '@sentry/tracing';

// const {
//   SENTRY_DSN,
//   NODE_ENV = 'development',
//   SENTRY_TRACES_SAMPLE_RATE = '0.0', // default off; set e.g. "0.1" in env to enable 10%
//   SENTRY_ENVIRONMENT,
//   SENTRY_RELEASE,
// } = process.env;

// /**
//  * Initialize Sentry.
//  * - Respect an empty/undefined DSN (no-op) so you can run locally without setting DSN.
//  * - Use a conservative default for tracesSampleRate unless explicitly set in env.
//  */
// if (SENTRY_DSN) {
//   try {
//     Sentry.init({
//       dsn: SENTRY_DSN,
//       environment: SENTRY_ENVIRONMENT || NODE_ENV,
//       release: SENTRY_RELEASE || undefined,
//       attachStacktrace: true,
//       // Only enable tracing when an explicit traces sample rate is set to a number > 0
//       tracesSampler: samplingContext => {
//         // If user provided explicit sample rate, use it
//         const rate = Number(SENTRY_TRACES_SAMPLE_RATE || 0);
//         if (!Number.isFinite(rate) || rate <= 0) return 0;
//         return Math.min(Math.max(rate, 0), 1);
//       },
//       integrations: defaults => {
//         // keep default integrations (HTTP, console), and add tracing integration
//         return [
//           ...defaults,
//           new SentryTracing.Integrations.Express({ app: undefined }),
//         ];
//       },
//       // Helpful: don't send PII by default unless you intentionally include it
//       sendDefaultPii: false,
//       tracesSampleRate: Number(SENTRY_TRACES_SAMPLE_RATE) || 0,
//     });

//     // Optional global event processor to strip sensitive fields from events
//     Sentry.addGlobalEventProcessor((event, hint) => {
//       // Example: remove cookies and small headers
//       if (event.request && event.request.headers) {
//         // Remove authorization header if present
//         if (event.request.headers.authorization) {
//           event.request.headers.authorization = '[REDACTED]';
//         }
//       }

//       // You can further scrub user/ip, etc. here if needed.
//       return event;
//     });
//   } catch (err) {
//     // eslint-disable-next-line no-console
//     console.warn('Sentry initialization failed:', err);
//   }
// } else {
//   // eslint-disable-next-line no-console
//   console.warn('SENTRY_DSN not set — Sentry disabled.');
// }

// /**
//  * Helper to flush Sentry (useful during graceful shutdown)
//  * Example:
//  *   await flushSentry(2000); // wait up to 2s
//  */
// export async function flushSentry(timeoutMs = 2000) {
//   if (Sentry.getCurrentHub && Sentry.getCurrentHub().getClient()) {
//     try {
//       // @ts-ignore - Sentry.flush is available on @sentry/node
//       await Sentry.flush(Number(timeoutMs));
//     } catch (err) {
//       // eslint-disable-next-line no-console
//       console.warn('Sentry flush failed', err);
//     }
//   }
// }

// export default Sentry;
