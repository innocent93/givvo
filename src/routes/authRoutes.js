// @ts-nocheck
import express from 'express';

import {
  logoutUser,
  changePassword,
  forgotPassword,
  login,
  register,
  resendCode,
  resetPassword,
  verifyEmail,
  verifyResetCode,
  acceptTerms,
  verifyLogin2FA,
} from '../controllers/authController.js';
import protectRoute from '../middlewares/protectRoute.js';

const userRouter = express.Router();

userRouter.post('/logout', protectRoute, logoutUser);
userRouter.post('/register', register);
userRouter.post('/verify-email', verifyEmail);
userRouter.post('/resend-code', resendCode);
userRouter.post('/verify-reset-code', verifyResetCode);
userRouter.post('/login', login);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/reset-password', resetPassword);
userRouter.post('/change-password', protectRoute, changePassword);
userRouter.post('/:userId', protectRoute, verifyLogin2FA);
// Accept terms
userRouter.post('/:userId/terms', protectRoute, acceptTerms);
// optionally create endpoint to resume from remember cookie
// userRouter.get('/resume', resumeSessionFromRememberMe);

// Admin approves
// userRouter.post("/:userId/approve", approveUser);

export default userRouter;
