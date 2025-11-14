// controllers/twofaController.js
import generateTokenAndSetCookie from '#src/utils/helpers/generateTokenAndSetCookie.js';
import { sendTwoFactorVerificationEmail } from '#src/utils/sendEmails.js';
import User from '../models/userModel.js';
import crypto from 'crypto';

/* ---------------------------------------------
   STEP 1: REQUEST 2FA ENABLE CODE
---------------------------------------------- */
export const enable2FARequest = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure twoFA exists
    if (!user.twoFA) {
      user.twoFA = {
        enabled: false,
        emailCode: null,
        emailCodeExpires: null,
      };
    }

    // Generate 4-digit code
    const code = crypto.randomInt(1000, 9999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    user.twoFA.emailCode = code;
    user.twoFA.emailCodeExpires = expires;
    await user.save();

    await sendTwoFactorVerificationEmail(user.email, code);

    res.json({
      message: '2FA verification code sent to your email.',
      userId: user._id,
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
    const { userId } = req.params;
    const { code } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.twoFA?.emailCode)
      return res.status(400).json({ error: 'No code generated' });

    if (new Date() > user.twoFA.emailCodeExpires)
      return res.status(400).json({ error: 'Code expired' });

    if (user.twoFA.emailCode !== code)
      return res.status(400).json({ error: 'Invalid code' });

    user.twoFA.enabled = true;
    user.twoFA.emailCode = null;
    user.twoFA.emailCodeExpires = null;

    await user.save();

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
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.twoFA?.enabled)
      return res.status(400).json({ error: '2FA is not enabled' });

    user.twoFA.enabled = false;
    user.twoFA.emailCode = null;
    user.twoFA.emailCodeExpires = null;
    await user.save();

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
    const { userId } = req.params;
    const { code } = req.body;

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.twoFA?.enabled)
      return res.status(400).json({ error: '2FA not enabled' });

    if (!user.twoFA.emailCode)
      return res.status(400).json({ error: 'No code generated for login' });

    if (new Date() > user.twoFA.emailCodeExpires)
      return res.status(400).json({ error: 'Code expired' });

    if (user.twoFA.emailCode !== code)
      return res.status(400).json({ error: 'Invalid code' });

    // Clear login code
    user.twoFA.emailCode = null;
    user.twoFA.emailCodeExpires = null;
    await user.save();

    // Generate JWT + cookie
    const token = generateTokenAndSetCookie(user._id, res, 'userId');

    res.json({
      message: '2FA verification successful, logged in.',
      token,
      user,
    });
  } catch (error) {
    console.error('Error verifying 2FA during login:', error);
    res.status(500).json({ error: error.message });
  }
};
