// @ts-nocheck
// app.js
// ESM Express app — resilient dynamic imports for optional modules (avoids ERR_MODULE_NOT_FOUND)
// Drop-in replacement for your previous app.js
// Requires "type": "module" in package.json and Node >= 14 (prefer Node 16+)

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import cloudinaryModule from 'cloudinary';
import Sentry from './config/sentry.js';
import { flushSentry } from './config/sentry.js';
import logger from './config/logger.js'; // prefer relative path — if this fails you'll get a clear error so fix path

// helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tryImportDefault = async (candidates = []) => {
  for (const p of candidates) {
    try {
      const mod = await import(p);
      // return default export if present, else whole module
      return mod.default || mod;
    } catch (err) {
      // continue trying other candidates
    }
  }
  return null;
};

//
// TRY TO LOAD ROUTES (many were using `#` aliases — we try common relative locations)
//
const userRouter = await tryImportDefault([
  './routes/authRoutes.js',
  './src/routes/authRoutes.js',
  './routes/auth/index.js',
]);
const profileRoutes = await tryImportDefault([
  './routes/profileRoutes.js',
  './src/routes/profileRoutes.js',
  './routes/profile/index.js',
]);
const adminProfileRoutes = await tryImportDefault([
  './routes/adminProfileRoutes.js',
  './src/routes/adminProfileRoutes.js',
  './routes/adminProfile/index.js',
]);
const twofaRoutes = await tryImportDefault([
  './routes/twofaRoutes.js',
  './src/routes/twofaRoutes.js',
  './routes/2fa/index.js',
]);
const admintwofaRoutes = await tryImportDefault([
  './routes/admintwofaRoutes.js',
  './src/routes/admintwofaRoutes.js',
  './routes/admin-2fa/index.js',
]);
const adminRouter = await tryImportDefault([
  './routes/adminRoute.js',
  './src/routes/adminRoute.js',
  './routes/admin/index.js',
]);

// passport config (try both possible paths)
const configurePassport = await tryImportDefault([
  './config/passport.js',
  './src/config/passport.js',
  './passport.js',
]);

// ---------- Express app setup ----------
const app = express();

// Sentry: attach request + tracing handlers BEFORE other middlewares / routes
if (Sentry && Sentry.Handlers) {
  app.use(Sentry.Handlers.requestHandler());
  if (
    process.env.SENTRY_TRACES_SAMPLE_RATE &&
    Number(process.env.SENTRY_TRACES_SAMPLE_RATE) > 0
  ) {
    app.use(Sentry.Handlers.tracingHandler());
  }
}

app.set('trust proxy', 1);

// cloudinary config (safe)
const cloudinary = cloudinaryModule.v2;
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  logger.warn('CLOUDINARY_CLOUD_NAME not set — cloudinary not configured.');
}

// Standard middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());

// morgan → logs to console plus our logger
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
  })
);

// Health + basic endpoints
app.get('/', (req, res) => {
  logger.info('Hello from Givvo!');
  res.status(200).send('Hello from Givvo!');
});

app.get('/health', (req, res) =>
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
);

app.get('/api', (req, res) =>
  res.status(200).json({
    status: 'Acquisition API is running',
    timestamp: new Date().toISOString(),
  })
);

app.get('/metrics', (req, res) =>
  res.status(200).json({
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
  })
);

// session
// at the top with other imports
import setupSession from './config/session.js';

// ... later (replace the previous app.use(session(...)) block) ...
// setup session store (Redis preferred, Mongo fallback)
await setupSession(app);

// passport initialization (if config loaded)
if (typeof configurePassport === 'function') {
  configurePassport(passport);
  app.use(passport.initialize());
  app.use(passport.session());
} else {
  logger.warn(
    'Passport configuration not found — passport not initialized. Path to config/passport.js may be wrong.'
  );
}

// Static admin page
try {
  const adminStatic = path.resolve(__dirname, '../public/admin');
  app.use('/ops', express.static(adminStatic));
} catch (err) {
  logger.warn('Failed to mount static admin page:', err.message);
}

// ------------ Mount routers if available (graceful) ------------
if (userRouter) {
  app.use('/api/v1/auth', userRouter);
  logger.info('Mounted auth routes: /api/v1/auth');
} else {
  logger.warn('Auth routes not found. Skipping /api/v1/auth mount.');
}

if (profileRoutes) {
  app.use('/api/v1/profile', profileRoutes);
  logger.info('Mounted profile routes: /api/v1/profile');
} else {
  logger.warn('Profile routes not found. Skipping /api/v1/profile mount.');
}

if (adminProfileRoutes) {
  app.use('/api/v1/admin/profile', adminProfileRoutes);
  logger.info('Mounted admin profile routes: /api/v1/admin/profile');
} else {
  logger.warn(
    'Admin profile routes not found. Skipping /api/v1/admin/profile mount.'
  );
}

if (twofaRoutes) {
  app.use('/api/v1/2fa', twofaRoutes);
  logger.info('Mounted 2FA routes: /api/v1/2fa');
} else {
  logger.warn('2FA routes not found. Skipping /api/v1/2fa mount.');
}

if (admintwofaRoutes) {
  app.use('/api/v1/admin/2fa', admintwofaRoutes);
  logger.info('Mounted admin 2FA routes: /api/v1/admin/2fa');
} else {
  logger.warn('Admin 2FA routes not found. Skipping /api/v1/admin/2fa mount.');
}

if (adminRouter) {
  app.use('/api/v1/admin', adminRouter);
  logger.info('Mounted admin router: /api/v1/admin');
} else {
  logger.warn('Admin router not found. Skipping /api/v1/admin mount.');
}

// ---------- Sentry error handler (must be before custom error handler)
if (Sentry && Sentry.Handlers) {
  app.use(Sentry.Handlers.errorHandler());
}

// Simple 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler (final)
app.use((err, req, res, next) => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const status = err.status || err.statusCode || 500;
  const message =
    NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Server Error';

  try {
    // attach limited request context for Sentry
    if (Sentry && Sentry.setContext) {
      Sentry.setContext('request', {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        query: req.query,
      });
      if (req.user?.id) Sentry.setUser({ id: String(req.user.id) });
      if (req.admin?._id) Sentry.setUser({ id: String(req.admin._id) });
    }
  } catch (_) {
    // ignore
  }

  // Only capture unexpected server errors
  if (status >= 500 && Sentry && Sentry.captureException) {
    try {
      Sentry.captureException(err);
    } catch (_) {}
  }

  // log locally
  logger.error(err);

  res.status(status).json({
    error: message,
    ...(NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

export default app;
