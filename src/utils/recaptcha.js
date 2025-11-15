// utils/recaptcha.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

export async function verifyRecaptcha(token, remoteIp = '') {
  if (!process.env.RECAPTCHA_SECRET) return true; // optional in dev
  const params = new URLSearchParams();
  params.append('secret', process.env.RECAPTCHA_SECRET);
  params.append('response', token);
  if (remoteIp) params.append('remoteip', remoteIp);

  const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: params,
  });
  const data = await r.json();
  // v2 returns success boolean; v3 returns score — adjust to your app
  if (!data.success) return false;
  // if v3: return data.score >= 0.5
  return true;
}
