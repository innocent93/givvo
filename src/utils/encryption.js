// @ts-nocheck
// utils/encryption.js
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const KEY = Buffer.from(process.env.TOTP_ENCRYPTION_KEY, 'hex'); // 32 bytes

if (!KEY || KEY.length !== 32) {
  throw new Error('TOTP_ENCRYPTION_KEY must be a 32 byte hex string');
}

export function encrypt(text) {
  const iv = crypto.randomBytes(12); // 96-bit recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // store iv, tag, encrypted as base64
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decrypt(payload) {
  const [ivB64, tagB64, encryptedB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !encryptedB64) throw new Error('Invalid payload');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
