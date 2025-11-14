// @ts-nocheck
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from '#config/logger.js';
import cookieParser from 'cookie-parser';
// import swaggerUi from 'swagger-ui-express';
// import { swaggerSpec } from '#config/swagger.js';
import rateLimit from '#middlewares/rateLimit.js';
import passport from 'passport';
import configurePassport from '#config/passport.js';
import session from 'express-session';
// Routes imports...
// import authRoutes from '#routes/authRoutes.js';

// import kycRoutes from '#routes/kycRoutes.js';
// import kycYVRoutes from '#routes/kycYVRoutes.js';
// import walletRoutes from '#routes/walletRoutes.js';
// import marketRoutes from '#routes/marketRoutes.js';
// import p2pRoutes from '#routes/p2pRoutes.js';
// import priceRoutes from '#routes/priceRoutes.js';
// import custodyRoutes from '#routes/custodyRoutes.js';
// import smsRoutes from '#routes/smsRoutes.js';
// import uploadsRoutes from '#routes/uploadsRoutes.js';
// import korapayRoutes from '#routes/korapayRoutes.js';
import profileRoutes from '#routes/profileRoutes.js';
import securityMiddleware from '#middlewares/security.middleware.js';
import cloudinaryModule from 'cloudinary';
import dotenv from 'dotenv';
import userRouter from '#routes/authRoutes.js';

dotenv.config();

const app = express();

const cloudinary = cloudinaryModule.v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(rateLimit);

// Swagger docs
// app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Static admin page
app.use(
  '/ops',
  express.static(new URL('../public/admin', import.meta.url).pathname)
);

app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
  })
);

app.use(securityMiddleware);

app.get('/', (req, res) => {
  logger.info('Hello from Givvo!');

  res.status(200).send('Hello from Givvo!');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'Acquisition API is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/metrics', (req, res) => {
  res.status(200).json({
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
  });
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'replace-with-secure-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' },
  })
);

// passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/v1/auth', userRouter);
// app.use('/api/v1/users', userRoutes);
// app.use('/api/v1/kyc', kycRoutes);
// app.use('/api/v1/kyc', kycYVRoutes);
// app.use('/api/v1/wallets', walletRoutes);
// app.use('/api/v1/market', marketRoutes);
// app.use('/api/v1/p2p', p2pRoutes);
// app.use('/api/v1/prices', priceRoutes);
// app.use('/api/v1/custody', custodyRoutes);
// app.use('/api/v1/messaging', smsRoutes);
// app.use('/api/v1/uploads', uploadsRoutes);
// app.use('/api/v1/korapay', korapayRoutes);
app.use('/api/v1/profile', profileRoutes);

// Global error handler

app.use(securityMiddleware);

export default app;
