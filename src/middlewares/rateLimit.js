import rateLimit from 'express-rate-limit';
export default rateLimit({ windowMs: 60000, max: 200 });

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8, // allow 8 requests per window per IP
  message: 'Too many requests from this IP, try again later.',
});
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // allow 5 requests per window per IP
  message: 'Too many login attempts from this IP, try again later.',
});
export const twoFALimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // allow 5 requests per window per IP
  message: 'Too many 2FA attempts from this IP, try again later.',
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // allow 5 requests per window per IP
  message: 'Too many password reset attempts from this IP, try again later.',
});
export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100, // allow 100 requests per window per IP
  message: 'Too many requests from this IP, try again later.',
});
