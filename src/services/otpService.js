import VerifyCode from '../models/VerifyCode.js';
function code6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
export async function createOtp(userId, purpose = 'signup', ttlMinutes = 10) {
  const code = code6();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await VerifyCode.create({
    userId,
    channel: 'email',
    purpose,
    code,
    expiresAt,
  });
  return code;
}
export async function verifyOtp(userId, purpose, code) {
  const rec = await VerifyCode.findOne({
    userId,
    channel: 'email',
    purpose,
  }).sort({ createdAt: -1 });
  if (!rec) throw new Error('OTP_NOT_FOUND');
  if (rec.usedAt) throw new Error('OTP_USED');
  if (rec.expiresAt < new Date()) throw new Error('OTP_EXPIRED');
  if (rec.code !== code) throw new Error('OTP_INVALID');
  rec.usedAt = new Date();
  await rec.save();
  return true;
}
