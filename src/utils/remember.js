// utils/remember.js
import crypto from 'crypto';
import User from '#src/models/userModel.js'; // adapt path
import dotenv from 'dotenv';
dotenv.config();

export function generateRawRememberToken() {
  return crypto.randomBytes(64).toString('hex'); // raw token
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Create remember token, save hashed token in DB, set cookie via res
 * Returns the raw token (for cookie).
 */
export async function createRememberMe(
  user,
  { res, deviceInfo = 'web', ip = null, days = 30 }
) {
  const raw = generateRawRememberToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000); // default 30d

  user.rememberMeTokens = user.rememberMeTokens || [];
  user.rememberMeTokens.push({
    tokenHash,
    deviceInfo,
    ip,
    createdAt: new Date(),
    expiresAt,
  });

  // keep list trimmed (optional)
  user.rememberMeTokens = user.rememberMeTokens.slice(-20);
  await user.save();

  res.cookie('remember_me', raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
  });

  return raw;
}

export async function validateRememberMe(rawToken) {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  // find the user that has token hash and not expired
  const user = await User.findOne({
    'rememberMeTokens.tokenHash': tokenHash,
    'rememberMeTokens.expiresAt': { $gt: new Date() },
  });

  return { user, tokenHash };
}

export async function revokeRememberToken(user, tokenHash) {
  user.rememberMeTokens = (user.rememberMeTokens || []).filter(
    t => t.tokenHash !== tokenHash
  );
  await user.save();
  return true;
}
