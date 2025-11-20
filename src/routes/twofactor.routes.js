import express from 'express';
import {
  enable2FARequestEmail,
  verify2FAEnableEmail,
  totpSetup,
  totpVerifyAndEnable,
  disable2FA,
  verify2FADuringLogin,
  totpLoginVerify,
} from '../controllers/twofactor.controller.js';

const router = express.Router();

router.post('/enable/email/request/:userId', enable2FARequestEmail);
router.post('/enable/email/verify/:userId', verify2FAEnableEmail);
router.post('/totp/setup/:userId', totpSetup);
router.post('/totp/verify/:userId', totpVerifyAndEnable);
router.post('/disable/:userId', disable2FA);
router.post('/login/verify/:userId', verify2FADuringLogin);
router.post('totp/login-verify/:userId', totpLoginVerify);

export default router;
