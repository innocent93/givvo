import express from 'express';
import {
  enable2FARequest,
  verify2FAEnable,
  disable2FA,
  verify2FADuringLogin,
  totpSetup,
  totpVerifyAndEnable,
  totpLoginVerify,
} from '../controllers/twofaController.js';
import protectRoute from '#src/middlewares/protectRoute.js';

const router = express.Router();

/* -----------------------------
   ENABLE 2FA FLOW
------------------------------ */

// Request code to enable 2FA
router.post('/enable/:userId/request', protectRoute, enable2FARequest);

// Verify code and enable 2FA
router.post('/enable/:userId/verify', verify2FAEnable);

router.post('/totp/setup/:userId', totpSetup);
router.post('/totp/verify/:userId', totpVerifyAndEnable);

/* -----------------------------
   DISABLE 2FA
------------------------------ */
router.post('/disable/:userId', protectRoute, disable2FA);

/* -----------------------------
   LOGIN 2FA VERIFICATION
------------------------------ */
router.post('/login/verify/:userId', verify2FADuringLogin);
router.post('/totp/login-verify/:userId', totpLoginVerify);

export default router;
