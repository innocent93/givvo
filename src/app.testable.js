// src/app.testable.js
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import adminRouter from './routes/adminRoutes.js';
import adminProfileRouter from './routes/adminProfileRoutes.js';
import userRouter from './routes/userRoutes.js';
import profileRouter from './routes/profileRoutes.js';
import twofaAdminRouter from './routes/adminTwofaRoutes.js';
import twofaRouter from './routes/twofaRoutes.js';

// test-only middleware (guarded by NODE_ENV inside file)
import testAuth from './middlewares/testAuth.js';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// enable testAuth early so protectAdmin can see req.admin in tests
if (process.env.NODE_ENV === 'test') {
  app.use(testAuth);
}

// Mount routers
app.use('/api/admin', adminRouter);
app.use('/api/admin/profile', adminProfileRouter);
app.use('/api/user', userRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin/2fa', twofaAdminRouter);
app.use('/api/2fa', twofaRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

export default app;
