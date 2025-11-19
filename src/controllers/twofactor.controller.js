// @ts-nocheck
// controllers/twofaController.js
import User from '#src/models/userModel.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import { encrypt, decrypt } from '#src/utils/encryption.js';
import { sendTwoFactorVerificationEmail } from '#src/utils/sendEmails.js';
import generateTokenAndSetCookie from '#src/utils/helpers/generateTokenAndSetCookie.js';
import { hashToken } from '#src/utils/remember.js';

// Request code for enabling email 2FA (existing flow)
export const enable2FARequestEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.twoFA) user.twoFA = { enabled: false, method: 'email' };

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    user.twoFA.emailCode = code;
    user.twoFA.emailCodeExpires = Date.now() + 10 * 60 * 1000;
    user.twoFA.method = 'email';
    await user.save();
    await sendTwoFactorVerificationEmail(user.email, code);
    return res.json({ message: 'Email code sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Verify email code and toggle enabled
export const verify2FAEnableEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.twoFA?.emailCode || user.twoFA.emailCode !== code)
      return res.status(400).json({ error: 'Invalid code' });
    if (new Date() > user.twoFA.emailCodeExpires)
      return res.status(400).json({ error: 'Code expired' });

    user.twoFA.enabled = true;
    user.twoFA.method = 'email';
    user.twoFA.emailCode = null;
    user.twoFA.emailCodeExpires = null;
    await user.save();
    return res.json({ message: 'Email 2FA enabled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ---------- TOTP setup ---------- */

// Generate TOTP secret + QR (user scans with Google Authenticator)
export const totpSetup = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = speakeasy.generateSecret({
      name: `Givvo (${user.email})`,
    });

    // encrypt secret before storing
    user.twoFA = user.twoFA || {};
    user.twoFA.totpSecret = encrypt(secret.base32);
    user.twoFA.totpEnabled = false; // not yet verified
    // Set method to totp (user may later choose)
    user.twoFA.method = 'totp';
    await user.save();

    const otpauth = secret.otpauth_url;
    const qrDataUrl = await qrcode.toDataURL(otpauth);

    res.json({ otpauth, qrDataUrl });
  } catch (err) {
    console.error('totpSetup error', err);
    res.status(500).json({ error: err.message });
  }
};

// Verify TOTP token to enable totp
export const totpVerifyAndEnable = async (req, res) => {
  try {
    const { userId } = req.params;
    const { token } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.twoFA?.totpSecret)
      return res.status(400).json({ error: 'No TOTP secret' });

    // decrypt secret
    const secret = decrypt(user.twoFA.totpSecret);

    const ok = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!ok) return res.status(400).json({ error: 'Invalid token' });

    user.twoFA.totpEnabled = true;
    user.twoFA.method = 'totp';
    // generate backup codes
    const rawBackup = [];
    const backup = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars
      rawBackup.push(code);
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      backup.push({ codeHash, used: false });
    }
    user.twoFA.backupCodes = backup;
    await user.save();

    // return raw codes to user only once
    return res.json({ message: 'TOTP enabled', backupCodes: rawBackup });
  } catch (err) {
    console.error('totpVerifyAndEnable error', err);
    res.status(500).json({ error: err.message });
  }
};

// Disable 2FA endpoint
export const disable2FA = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.twoFA = {
      enabled: false,
      method: 'email',
      emailCode: null,
      emailCodeExpires: null,
      totpSecret: null,
      totpEnabled: false,
      backupCodes: [],
    };
    await user.save();
    return res.json({ message: '2FA disabled' });
  } catch (err) {
    console.error('disable2FA error', err);
    res.status(500).json({ error: err.message });
  }
};

// Verify during login: handles TOTP and backup codes
export const verify2FADuringLogin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { token, remember } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // if TOTP enabled
    if (user.twoFA?.totpEnabled) {
      const secret = decrypt(user.twoFA.totpSecret);
      const ok = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1,
      });
      if (!ok) {
        // check backup codes next
        // fallthrough
      } else {
        // clear any emailCode
        user.twoFA.emailCode = null;
        user.twoFA.emailCodeExpires = null;
        await user.save();

        const jwt = generateTokenAndSetCookie(user._id, res, 'userId');
        if (remember) {
          await createRememberMe(user, {
            res,
            deviceInfo: req.get('User-Agent'),
            ip: req.ip,
          });
        }
        return res.json({ message: '2FA verified (TOTP)', token: jwt, user });
      }
    }

    // backup code verify
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const bcIndex = (user.twoFA?.backupCodes || []).findIndex(
      b => b.codeHash === hashed && !b.used
    );
    if (bcIndex >= 0) {
      user.twoFA.backupCodes[bcIndex].used = true;
      await user.save();
      const jwt = generateTokenAndSetCookie(user._id, res, 'userId');
      if (remember) {
        await createRememberMe(user, {
          res,
          deviceInfo: req.get('User-Agent'),
          ip: req.ip,
        });
      }
      return res.json({
        message: '2FA verified (backup code)',
        token: jwt,
        user,
      });
    }

    // if totp not enabled but email 2FA active
    if (user.twoFA?.enabled && !user.twoFA?.totpEnabled) {
      // check email code
      if (!user.twoFA.emailCode)
        return res.status(400).json({ error: 'No code generated' });
      if (new Date() > user.twoFA.emailCodeExpires)
        return res.status(400).json({ error: 'Code expired' });
      if (user.twoFA.emailCode !== token)
        return res.status(400).json({ error: 'Invalid code' });

      user.twoFA.emailCode = null;
      user.twoFA.emailCodeExpires = null;
      await user.save();
      const jwt = generateTokenAndSetCookie(user._id, res, 'userId');
      if (remember) {
        await createRememberMe(user, {
          res,
          deviceInfo: req.get('User-Agent'),
          ip: req.ip,
        });
      }
      return res.json({ message: '2FA verified (email)', token: jwt, user });
    }

    return res.status(400).json({ error: '2FA verification failed' });
  } catch (err) {
    console.error('verify2FADuringLogin error', err);
    res.status(500).json({ error: err.message });
  }
};

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
