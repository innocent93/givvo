// @ts-nocheck
import express from 'express';
import {
  enable2FARequest,
  verify2FAEnable,
  disable2FA,
  verify2FADuringLogin,
} from '../controllers/admintwofaController.js';
import protectAdmin from '#src/middlewares/protectAdmin.js';

const router = express.Router();

/* -----------------------------
   ENABLE 2FA FLOW
------------------------------ */

// Request code to enable 2FA
router.post('/enable/:adminId/request', protectAdmin, enable2FARequest);

// Verify code and enable 2FA
router.post('/enable/:adminId/verify', verify2FAEnable);

/* -----------------------------
   DISABLE 2FA
------------------------------ */
router.post('/disable/:adminId', protectAdmin, disable2FA);

/* -----------------------------
   LOGIN 2FA VERIFICATION
------------------------------ */
router.post('/login/verify/:adminId', verify2FADuringLogin);

export default router;
