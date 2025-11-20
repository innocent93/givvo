// @ts-nocheck
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import connectDB from '#config/db.js';
// import config from '../config.js';
import app from './app.js';
import startExpiryWorker from './cron/expiriWorker.js';

// ---------------------------
// 1. CONNECT TO DATABASE
// ---------------------------
await connectDB();

// ---------------------------
// 2. CREATE HTTP SERVER
// ---------------------------
const server = createServer(app);

// ---------------------------
// 3. INIT SOCKET.IO
// ---------------------------
export const io = new IOServer(server, {
  cors: { origin: process.env.SOCKET_ORIGIN || '*' },
});

// Make it globally available (optional)
// eslint-disable-next-line no-undef
global.io = io;

// Socket handlers
io.on('connection', socket => {
  console.log('✅ Socket connected:', socket.id);

  socket.on('join', room => socket.join(room));
  socket.on('leave', room => socket.leave(room));

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

// ---------------------------
// 4. START SERVER
// ---------------------------
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Naelix API v9 running on port ${PORT}`);
  startExpiryWorker(); // start expiry worker
});

// // @ts-nocheck
// import { createServer } from 'http';
// import { Server as IOServer } from 'socket.io';
// import connectDB from '#config/db.js';

// import app from './app.js';

// // DB + Server
// await connectDB();

// const server = createServer(app);

// export const io = new IOServer(server, { cors: { origin: '*' } });
// server.listen(process.env.PORT || 8080, () => {
//   console.log('✅ Naelix API v9 running on port', process.env.PORT || 8080);
// });

// // @ts-nocheck
// import express from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import morgan from 'morgan';
// import logger from '#config/logger.js';
// import cookieParser from 'cookie-parser';
// import { createServer } from 'http';
// import { Server as IOServer } from 'socket.io';
// import swaggerUi from 'swagger-ui-express';
// import { swaggerSpec } from '#/config/swagger.js';
// import { connectDB } from '#/config/db.js';
// import rateLimit from '#/middlewares/rateLimit.js';
// import errorHandler from '#/middlewares/errorHandler.js';

// // Routes imports...
// import authRoutes from './routes/authRoutes.js';
// import userRoutes from './routes/userRoutes.js';
// import kycRoutes from './routes/kycRoutes.js';
// import kycYVRoutes from './routes/kycYVRoutes.js';
// import walletRoutes from './routes/walletRoutes.js';
// import marketRoutes from './routes/marketRoutes.js';
// import p2pRoutes from './routes/p2pRoutes.js';
// import priceRoutes from './routes/priceRoutes.js';
// import custodyRoutes from './routes/custodyRoutes.js';
// import smsRoutes from './routes/smsRoutes.js';
// import uploadsRoutes from './routes/uploadsRoutes.js';
// import korapayRoutes from './routes/korapayRoutes.js';
// import profileRoutes from './routes/profileRoutes.js';
// import securityMiddleware from './middlewares/security.middleware.js';

// const app = express();

// // Middleware
// app.use(helmet());
// app.use(cors({ origin: '*' }));
// app.use(express.json({ limit: '5mb' }));
// app.use(cookieParser());
// app.use(morgan('dev'));
// app.use(rateLimit);

// // Swagger docs
// app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// // Static admin page
// app.use(
//   '/ops',
//   express.static(new URL('../public/admin', import.meta.url).pathname)
// );

// app.use(
//   morgan('combined', {
//     stream: { write: message => logger.info(message.trim()) },
//   })
// );

// app.use(securityMiddleware);

// app.get('/', (req, res) => {
//   logger.info('Hello from Acquisitions!');

//   res.status(200).send('Hello from Acquisitions!');
// });

// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'OK',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//   });
// });

// app.get('/api', (req, res) => {
//   res.status(200).json({
//     status: 'Acquisition API is running',
//     timestamp: new Date().toISOString(),
//   });
// });

// app.get('/metrics', (req, res) => {
//   res.status(200).json({
//     memoryUsage: process.memoryUsage(),
//     cpuUsage: process.cpuUsage(),
//   });
// });

// // Routes
// app.use('/api/v1/auth', authRoutes);
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
// app.use('/api/v1/profile', profileRoutes);

// // Global error handler
// app.use( errorHandler );
// app.use( securityMiddleware );

// // DB + Server
// await connectDB();
// const server = createServer(app);
// export const io = new IOServer(server, { cors: { origin: '*' } });

// server.listen(process.env.PORT || 8080, () => {
//   console.log('✅ Naelix API v9 running on port', process.env.PORT || 8080);
// });
