// @ts-nocheck
// CLEAN — PRODUCTION-SAFE — ESM EXPRESS APP
// Works with Node 16+ and "type": "module"

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import cloudinaryModule from 'cloudinary';
import passport from 'passport';

import Sentry, { flushSentry } from './config/sentry.js';
import logger from './config/logger.js';
import setupSession from './config/session.js';

// Helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/********************************************************************
 * CLEAN MODULE LOADER
 ********************************************************************/
const loadModule = async (label, candidates = []) => {
  for (const file of candidates) {
    try {
      const mod = await import(file);
      logger.info(`📦 Loaded ${label} from ${file}`);
      return mod.default || mod;
    } catch (_) {
      logger.warn(`⚠️ ${label} not found at: ${file}`);
    }
  }

  logger.error(`❌ Failed to load ${label}.`);
  return null;
};

/********************************************************************
 * LOAD ROUTERS
 ********************************************************************/
const userRouter = await loadModule('Auth Routes', [
  './routes/authRoutes.js',
  './src/routes/authRoutes.js',
  './routes/auth/index.js',
]);

const profileRoutes = await loadModule('Profile Routes', [
  './routes/profileRoutes.js',
  './src/routes/profileRoutes.js',
]);

const adminProfileRoutes = await loadModule('Admin Profile Routes', [
  './routes/adminProfileRoutes.js',
  './src/routes/adminProfileRoutes.js',
]);

const twofaRoutes = await loadModule('User 2FA Routes', [
  './routes/twofaRoutes.js',
  './src/routes/twofaRoutes.js',
]);


const twofactor = await loadModule('User 2FA Routes', [
  './routes/twofactor.routes.js',
  './src/routes/twofactor.routes.js',
]);

const admintwofaRoutes = await loadModule('Admin 2FA Routes', [
  './routes/admintwofaRoutes.js',
  './src/routes/admintwofaRoutes.js',
]);

const adminRouter = await loadModule('Admin Router', [
  './routes/adminRouter.js',
  './src/routes/adminRouter.js',
  './routes/admin/index.js',
]);

// Passport config
const configurePassport = await loadModule('Passport Config', [
  './config/passport.js',
  './src/config/passport.js',
  './passport.js',
]);

/********************************************************************
 * EXPRESS APP SETUP
 ********************************************************************/
const app = express();

// ----------- Sentry (request + tracing handler) -----------
if (Sentry?.Handlers) {
  app.use(Sentry.Handlers.requestHandler());
  if (Number(process.env.SENTRY_TRACES_SAMPLE_RATE) > 0) {
    app.use(Sentry.Handlers.tracingHandler());
  }
}

app.set('trust proxy', 1);

// ----------- Cloudinary Config -----------
const cloudinary = cloudinaryModule.v2;
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  logger.info('Cloudinary configured.');
} else {
  logger.warn('Cloudinary NOT configured (env missing).');
}

// ----------- Middleware -----------
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());

// Morgan logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  morgan('combined', {
    stream: { write: msg => logger.info(msg.trim()) },
  })
);

// ----------- Base Endpoints -----------
app.get('/', (req, res) => res.status(200).send('Hello from Givvo!'));

app.get('/health', (req, res) =>
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
);

app.get('/api', (req, res) =>
  res.json({
    status: 'Acquisition API running',
    timestamp: new Date().toISOString(),
  })
);

app.get('/metrics', (req, res) =>
  res.json({
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
  })
);

/********************************************************************
 * SESSION + PASSPORT
 ********************************************************************/
await setupSession(app);

if (typeof configurePassport === 'function') {
  configurePassport(passport);
  app.use(passport.initialize());
  app.use(passport.session());
  logger.info('Passport initialized.');
} else {
  logger.warn('Passport NOT initialized — missing passport.js');
}

/********************************************************************
 * STATIC ADMIN PANEL
 ********************************************************************/
try {
  const adminStatic = path.resolve(__dirname, '../public/admin');
  app.use('/ops', express.static(adminStatic));
  logger.info('Admin static mounted at /ops');
} catch (err) {
  logger.warn('Admin static mount failed: ' + err.message);
}

/********************************************************************
 * ROUTES MOUNTING
 ********************************************************************/
if (userRouter) {
  app.use('/api/v1/auth', userRouter);
  logger.info('Mounted /api/v1/auth');
}

if (profileRoutes) {
  app.use('/api/v1/profile', profileRoutes);
  logger.info('Mounted /api/v1/profile');
}

if (adminProfileRoutes) {
  app.use('/api/v1/admin/profile', adminProfileRoutes);
  logger.info('Mounted /api/v1/admin/profile');
}

if (twofaRoutes) {
  app.use('/api/v1/2fa', twofaRoutes);
  logger.info('Mounted /api/v1/2fa');
}

if (twofactor) {
  app.use('/api/v1/2factor', twofactor);
  logger.info('Mounted /api/v1/2fa');
}

if (admintwofaRoutes) {
  app.use('/api/v1/admin/2fa', admintwofaRoutes);
  logger.info('Mounted /api/v1/admin/2fa');
}

if (adminRouter) {
  app.use('/api/v1/admin', adminRouter);
  logger.info('Mounted /api/v1/admin');
}

/********************************************************************
 * ERROR HANDLERS
 ********************************************************************/

// Sentry error handler
if (Sentry?.Handlers) {
  app.use(Sentry.Handlers.errorHandler());
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
  const env = process.env.NODE_ENV || 'development';
  const status = err.status || 500;

  if (status >= 500 && Sentry?.captureException) {
    Sentry.captureException(err);
  }

  logger.error(err);

  res.status(status).json({
    error: env === 'production' ? 'Internal Server Error' : err.message,
    ...(env !== 'production' && { stack: err.stack }),
  });
});

export default app;
