// @ts-nocheck
// controllers/twofaController.js
import generateTokenAndSetCookie from '#src/utils/helpers/generateTokenAndSetCookie.js';
import { sendTwoFactorVerificationEmail } from '#src/utils/sendEmails.js';
import User from '../models/userModel.js';
import crypto from 'crypto';

import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

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
      _id: user._id,
      email: user.email,
      msg: 'Login Successful',
      isVerified: true,
      role: user.role,
      lastLogin: user.lastLogin,
      loginStatus: user.loginStatus,
      isApproved: user.isApproved,
      twoFA: user.twoFA?.enabled,
      documentStatus: user.identityDocuments?.status,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    console.error('Error verifying 2FA during login:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET or POST /api/2fa/totp/setup/:userId
export const totpSetup = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // generate secret
    const secret = speakeasy.generateSecret({
      name: `Givvo (${user.email})`, // shows in Google Authenticator
      length: 20,
    });

    // Save secret (you may encrypt before save)
    user.twoFA.totpSecret = secret.base32;
    await user.save();

    // otpauth url, and also produce qr image
    const otpauth = secret.otpauth_url;
    const qrDataUrl = await qrcode.toDataURL(otpauth);

    res.json({ otpauth, qrDataUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error('Error in TOTP setup:', error);
  }
};

// POST /api/2fa/totp/verify/:userId
export const totpVerifyAndEnable = async (req, res) => {
  const { userId } = req.params;
  const { token } = req.body; // 6-digit from app
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.twoFA.totpSecret)
    return res.status(400).json({ error: 'No TOTP secret set' });

  const verified = speakeasy.totp.verify({
    secret: user.twoFA.totpSecret,
    encoding: 'base32',
    token,
    window: 1, // allow ±1 step (30s) drift
  });

  if (!verified) return res.status(400).json({ error: 'Invalid token' });

  // mark enabled and generate backup codes
  user.twoFA.totpEnabled = true;
  user.twoFA.totpSecret = user.twoFA.totpSecret; // keep stored (encrypted recommended)
  user.twoFA.method = 'totp';

  // generate backup codes (8 codes)
  const rawBackupCodes = [];
  const backupHashes = [];
  for (let i = 0; i < 8; i++) {
    const code = Math.random().toString(36).slice(-8).toUpperCase();
    rawBackupCodes.push(code);
    const hash = crypto.createHash('sha256').update(code).digest('hex'); // or bcrypt
    backupHashes.push({ codeHash: hash, used: false });
  }
  user.twoFA.backupCodes = backupHashes;

  await user.save();

  // return rawBackupCodes to user ONCE (show/download)
  res.json({ message: 'TOTP enabled', backupCodes: rawBackupCodes });
};
// Additional functions for TOTP disable and login verification can be added similarly

// POST /api/2fa/totp/login-verify/:userId
export const totpLoginVerify = async (req, res) => {
  const { userId } = req.params;
  const { token } = req.body; // 6-digit or backup code
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // First check TOTP
  if (user.twoFA.totpEnabled) {
    const ok = speakeasy.totp.verify({
      secret: user.twoFA.totpSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (ok) {
      // success -> clear any email codes, generate auth token (or remember-me afterwards)
      // create cookie token using generateTokenAndSetCookie
      const tokenStr = generateTokenAndSetCookie(user._id, res, 'userId');
      return res.json({ message: 'Login successful', token: tokenStr, user });
    }
  }

  // If not TOTP ok, check backup codes (sha256)
  const codeHash = crypto.createHash('sha256').update(token).digest('hex');
  const bc = user.twoFA.backupCodes.find(
    b => b.codeHash === codeHash && !b.used
  );
  if (bc) {
    bc.used = true;
    await user.save();
    const tokenStr = generateTokenAndSetCookie(user._id, res, 'userId');
    return res.json({
      message: 'Login successful using backup code',
      token: tokenStr,
      user,
    });
  }

  return res.status(400).json({ error: 'Invalid 2FA token' });
};

/**
 * Create a Remember-Me token, store its hash on the user,
 * and issue the raw token as an httpOnly cookie.
 */
export default async function createRememberMeToken(
  user,
  req,
  res,
  deviceInfo = 'web'
) {
  // Generate raw token
  const raw = crypto.randomBytes(64).toString('hex');

  // Hash stored in DB
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Push into user's rememberMeTokens array
  user.rememberMeTokens.push({
    tokenHash: hash,
    deviceInfo,
    ip: req.ip || null,
    userAgent: req.headers['user-agent'] || null,
    expiresAt,
  });

  await user.save();

  // Send cookie
  res.cookie('remember_me', raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/', // important!
  });

  return raw;
}
