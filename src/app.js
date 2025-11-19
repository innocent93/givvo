// @ts-nocheck
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

import Sentry from './config/sentry.js';
import logger from './config/logger.js';
import setupSession from './config/session.js';

// ROUTES (Normal Imports – NO loader)

import profileRoutes from './routes/profileRoutes.js';
import adminProfileRoutes from './routes/adminProfileRoutes.js';

import twofaRoutes from './routes/twofaRoutes.js';
import twofactorRoutes from './routes/twofactor.routes.js';

import admintwofaRoutes from './routes/admintwofaRoutes.js';
import adminRouter from './routes/adminRoute.js';

// Passport config
import configurePassport from './config/passport.js';
import userRouter from './routes/authRoutes.js';

// Helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express App
const app = express();

/**************************************************************************
 * SENTRY MIDDLEWARE
 **************************************************************************/
if (Sentry?.Handlers) {
  app.use(Sentry.Handlers.requestHandler());
  if (Number(process.env.SENTRY_TRACES_SAMPLE_RATE) > 0) {
    app.use(Sentry.Handlers.tracingHandler());
  }
}

/**************************************************************************
 * BASIC CONFIG
 **************************************************************************/
app.set('trust proxy', 1);

const cloudinary = cloudinaryModule.v2;
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**************************************************************************
 * GLOBAL MIDDLEWARE
 **************************************************************************/
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: msg => logger.info(msg.trim()) },
  })
);

/**************************************************************************
 * SESSION + PASSPORT
 **************************************************************************/
await setupSession(app);
configurePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

/**************************************************************************
 * STATIC ADMIN PANEL
 **************************************************************************/
app.use('/ops', express.static(path.resolve(__dirname, '../public/admin')));

/**************************************************************************
 * ROUTES (NORMAL IMPORT AND USE)
 **************************************************************************/

// Auth
app.use('/api/v1/auth', userRouter);

// User Profile
app.use('/api/v1/profile', profileRoutes);

// Admin Profile
app.use('/api/v1/admin/profile', adminProfileRoutes);

// User 2FA (old version)
app.use('/api/v1/2fa', twofaRoutes);

// User 2FA (new version)
app.use('/api/v1/2factor', twofactorRoutes);

// Admin 2FA
app.use('/api/v1/admin/2fa', admintwofaRoutes);

// Admin General Router
app.use('/api/v1/admin', adminRouter);

/**************************************************************************
 * BASE ENDPOINTS
 **************************************************************************/
app.get('/', (req, res) => res.send('Hello from Givvo!'));

app.get('/health', (req, res) =>
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
);

/**************************************************************************
 * ERROR HANDLING
 **************************************************************************/

// Sentry
if (Sentry?.Handlers) {
  app.use(Sentry.Handlers.errorHandler());
}

// 404 Route
app.use((req, res) => {
  res.status(404).json({ error: 'Route Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  logger.error(err);

  res.status(status).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

export default app;
