// @ts-nocheck
// controllers/twofaController.js
import generateTokenAndSetCookie from '#src/utils/helpers/generateTokenAndSetCookie.js';
import { sendTwoFactorVerificationEmail } from '#src/utils/sendEmails.js';
import Admin from '../models/adminModel.js';
import crypto from 'crypto';

/* ---------------------------------------------
   STEP 1: REQUEST 2FA ENABLE CODE
---------------------------------------------- */
export const enable2FARequest = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ error: 'admin not found' });

    // Ensure twoFA exists
    if (!admin.twoFA) {
      admin.twoFA = {
        enabled: false,
        emailCode: null,
        emailCodeExpires: null,
      };
    }

    // Generate 4-digit code
    const code = crypto.randomInt(1000, 9999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    admin.twoFA.emailCode = code;
    admin.twoFA.emailCodeExpires = expires;
    await admin.save();

    await sendTwoFactorVerificationEmail(admin.email, code);

    res.json({
      message: '2FA verification code sent to your email.',
      adminId: admin._id,
    });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(500).json({ error: error.message });
  }
};

/* ---------------------------------------------
   STEP 2: VERIFY CODE AND ENABLE 2FA
---------------------------------------------- */
export const verify2FAEnable = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { code } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ error: 'admin not found' });

    if (!admin.twoFA?.emailCode)
      return res.status(400).json({ error: 'No code generated' });

    if (new Date() > admin.twoFA.emailCodeExpires)
      return res.status(400).json({ error: 'Code expired' });

    if (admin.twoFA.emailCode !== code)
      return res.status(400).json({ error: 'Invalid code' });

    admin.twoFA.enabled = true;
    admin.twoFA.emailCode = null;
    admin.twoFA.emailCodeExpires = null;

    await admin.save();

    res.json({ message: '2FA enabled successfully', enabled: true });
  } catch (error) {
    console.error('Error verifying enable 2FA:', error);
    res.status(500).json({ error: error.message });
  }
};

/* ---------------------------------------------
   STEP 3: DISABLE 2FA
---------------------------------------------- */
export const disable2FA = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ error: 'admin not found' });

    if (!admin.twoFA?.enabled)
      return res.status(400).json({ error: '2FA is not enabled' });

    admin.twoFA.enabled = false;
    admin.twoFA.emailCode = null;
    admin.twoFA.emailCodeExpires = null;
    await admin.save();

    res.json({ message: '2FA disabled successfully', enabled: false });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: error.message });
  }
};

/* ---------------------------------------------
   STEP 4: VERIFY LOGIN 2FA
---------------------------------------------- */
export const verify2FADuringLogin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { code } = req.body;

    const admin = await Admin.findById(adminId);

    if (!admin) return res.status(404).json({ error: 'admin not found' });

    if (!admin.twoFA?.enabled)
      return res.status(400).json({ error: '2FA not enabled' });

    if (!admin.twoFA.emailCode)
      return res.status(400).json({ error: 'No code generated for login' });

    if (new Date() > admin.twoFA.emailCodeExpires)
      return res.status(400).json({ error: 'Code expired' });

    if (admin.twoFA.emailCode !== code)
      return res.status(400).json({ error: 'Invalid code' });

    // Clear login code
    admin.twoFA.emailCode = null;
    admin.twoFA.emailCodeExpires = null;
    await admin.save();

    // Generate JWT + cookie
    const token = generateTokenAndSetCookie(admin._id, res, 'adminId');

    res.json({
      message: '2FA verification successful, logged in.',
      token,
      admin,
    });
  } catch (error) {
    console.error('Error verifying 2FA during login:', error);
    res.status(500).json({ error: error.message });
  }
};
