import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
export default async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const t = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!t) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const p = jwt.verify(t, process.env.JWT_SECRET);
    const u = await User.findById(p.sub);
    if (!u) return res.status(401).json({ error: 'INVALID_SESSION' });
    req.user = { id: u._id.toString(), roles: u.roles, email: u.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'UNAUTHORIZED', e });
  }
}
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const ok = req.user.roles.some(r => roles.includes(r));
    if (!ok) return res.status(403).json({ error: 'FORBIDDEN' });
    next();
  };
}
