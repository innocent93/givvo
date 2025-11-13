import nodemailer from 'nodemailer';
import axios from 'axios';
function layout(subject, body) {
  const brand = process.env.APP_BRAND_NAME || 'Naelix';
  return `<div style="font-family:Inter,Arial,sans-serif;background:#0b0e14;padding:24px;color:#e6e9ef"><table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#111526;border-radius:16px"><tr><td style="padding:20px 24px;background:#0b0e14;border-bottom:1px solid #1b2136"><strong style="font-size:18px;color:#fff">${brand}</strong></td></tr><tr><td style="padding:24px">${body}</td></tr><tr><td style="padding:16px 24px;background:#0b0e14;color:#8a91a7;font-size:12px">© ${new Date().getFullYear()} ${brand}</td></tr></table></div>`;
}
export function renderOtp(code) {
  return layout(
    'Verify',
    `<h2 style="margin:0 0 12px;color:#fff">Verify your email</h2><div style="font-size:32px;letter-spacing:8px;font-weight:700;padding:16px 24px;border:1px solid #1b2136;border-radius:12px">${code}</div>`
  );
}
export async function sendOtpEmail(to, code) {
  // Prefer Cloudflare Worker if configured
  if (process.env.CF_EMAIL_WORKER_URL) {
    await axios.post(
      process.env.CF_EMAIL_WORKER_URL,
      {
        to,
        subject: 'Your verification code',
        html: renderOtp(code),
        from: process.env.EMAIL_FROM,
      },
      { headers: { 'X-Auth-Key': process.env.CF_EMAIL_WORKER_KEY || '' } }
    );
    return { ok: true, via: 'cloudflare' };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Your verification code',
    html: renderOtp(code),
  });
  return { ok: true, via: 'smtp' };
}
