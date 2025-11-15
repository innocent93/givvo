// @ts-nocheck
import express from 'express';
import {
  changePassword,
  createAdmin,
  forgotPassword,
  login,
  logoutUser,
  resendCode,
  resetPassword,
  verifyEmail,
  verifyResetCode,
  getAllUsers,
  getUserById,
  createSuperadmin,
  deleteAdminById,
  getAdminById,
  getSuperAdminById,
  listAuthLogs,
  exportLogs,
  listSessions,
  revokeSession,
  lockUnlockUser,
  stats,
} from '../controllers/adminControllers.js';
import { authorizeRoles, protectAdmin } from '../middlewares/adminAuth.js';
import { paginate } from '#src/middlewares/paginate.js';
// import { uploadAdminProfilePhoto } from '../middlewares/upload.js';

// import { cacheMiddleware } from "../middlewares/cache.js";
// import vehicleImages from "../middlewares/multer.js";

const adminRouter = express.Router();

adminRouter.post('/login', login);
// Only superadmin can create another superadmin
adminRouter.post('/create-superadmin', createSuperadmin);

// Only superadmin can create admins
adminRouter.post(
  '/create-admin',
  protectAdmin,
  authorizeRoles('superadmin'),
  createAdmin
);
adminRouter.post('/logout', protectAdmin, logoutUser);
adminRouter.post('/resend-code', resendCode);
adminRouter.post('/change-password', protectAdmin, changePassword);
adminRouter.post('/verify-email', verifyEmail);
adminRouter.post('/forgot-password', forgotPassword);
adminRouter.post('/verify-reset-code', verifyResetCode);
adminRouter.post('/reset-password', resetPassword);

// Admin-only routes
adminRouter.get(
  '/users',
  protectAdmin,
  authorizeRoles('superadmin', 'admin'),
  getAllUsers
);

// ✅ Only superadmin can delete an admin
adminRouter.delete(
  '/:id',
  protectAdmin,
  authorizeRoles('superadmin'),
  deleteAdminById
);

adminRouter.get(
  '/users/:userId',
  protectAdmin,
  authorizeRoles('superadmin', 'admin'),
  getUserById
);

adminRouter.get('/admin/:adminId', protectAdmin, getAdminById);
adminRouter.get('/superadmin/:superAdminId', protectAdmin, getSuperAdminById);
// logs
adminRouter.get('/logs', paginate(25), listAuthLogs);
adminRouter.get('/logs/export', exportLogs);

// sessions
adminRouter.get('/sessions', paginate(25), listSessions);
adminRouter.post('/sessions/:id/revoke', revokeSession);

// user actions
adminRouter.post('/users/:id/lock', lockUnlockUser);

// stats
adminRouter.get('/stats', stats);
export default adminRouter;
