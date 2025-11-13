import rateLimit from 'express-rate-limit';
export default rateLimit({ windowMs: 60000, max: 200 });
