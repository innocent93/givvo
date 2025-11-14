import express from 'express';
import {
  enable2FARequest,
  verify2FAEnable,
  disable2FA,
  verify2FADuringLogin,
} from '../controllers/twofaController.js';

const router = express.Router();

/* -----------------------------
   ENABLE 2FA FLOW
------------------------------ */

// Request code to enable 2FA
router.post('/enable/:userId/request', enable2FARequest);

// Verify code and enable 2FA
router.post('/enable/:userId/verify', verify2FAEnable);

/* -----------------------------
   DISABLE 2FA
------------------------------ */
router.post('/disable/:userId', disable2FA);

/* -----------------------------
   LOGIN 2FA VERIFICATION
------------------------------ */
router.post('/login/verify/:userId', verify2FADuringLogin);

export default router;
