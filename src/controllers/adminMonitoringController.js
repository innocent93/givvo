// controllers/adminMonitoringController.js
import AuthLog from '#src/models/AuthLog.js';
import DeviceSession from '#src/models/DeviceSession.js';
import User from '#src/models/userModel.js';
import crypto from 'crypto';
import { Parser as Json2csvParser } from 'json2csv';

/**
 * GET /admin/logs
 * Query: event, userId, email, ip, from, to, page, limit
 */
export const listAuthLogs = async (req, res) => {
  const { event, userId, email, ip, from, to } = req.query;
  const { skip, limit } = req.pagination || { skip: 0, limit: 50 };

  const filter = {};
  if (event) filter.event = event;
  if (userId) filter.userId = userId;
  if (email) filter.email = email;
  if (ip) filter.ip = ip;
  if (from || to) filter.createdAt = {};
  if (from) filter.createdAt.$gte = new Date(from);
  if (to) filter.createdAt.$lte = new Date(to);

  const [rows, total] = await Promise.all([
    AuthLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuthLog.countDocuments(filter),
  ]);

  res.json({
    total,
    pageSize: limit,
    page: Math.floor(skip / limit) + 1,
    rows,
  });
};

/**
 * GET /admin/sessions
 * List active device sessions
 */
export const listSessions = async (req, res) => {
  const { userId } = req.query;
  const { skip, limit } = req.pagination || { skip: 0, limit: 50 };

  const filter = {};
  if (userId) filter.userId = userId;

  const [rows, total] = await Promise.all([
    DeviceSession.find(filter)
      .sort({ lastSeenAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DeviceSession.countDocuments(filter),
  ]);

  // populate user emails quickly
  const userIds = [...new Set(rows.map(r => String(r.userId)).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } }, { email: 1 }).lean();
  const byId = Object.fromEntries(users.map(u => [String(u._id), u]));

  rows.forEach(r => (r.user = byId[String(r.userId)] || null));

  res.json({
    total,
    pageSize: limit,
    page: Math.floor(skip / limit) + 1,
    rows,
  });
};

/**
 * POST /admin/sessions/:id/revoke
 * revoke a device session
 */
export const revokeSession = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id;

  const session = await DeviceSession.findById(id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.revoked)
    return res.status(400).json({ error: 'Already revoked' });

  session.revoked = true;
  session.revokedAt = new Date();
  session.revokedBy = adminId;
  await session.save();

  // log action
  await AuthLog.create({
    userId: session.userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    event: 'remember_me_revoked',
    details: { sessionId: session._id, revokedBy: adminId },
  });

  res.json({ message: 'Revoked', sessionId: session._id });
};

/**
 * POST /admin/users/:id/lock
 * lock or unlock account
 * body: { action: 'lock'|'unlock', reason?: string }
 */
export const lockUnlockUser = async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (action === 'lock') {
    user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15m
    await user.save();
    await AuthLog.create({
      userId: user._id,
      event: 'account_locked',
      ip: req.ip,
      details: { reason },
    });
    return res.json({ message: 'User locked' });
  }

  if (action === 'unlock') {
    user.lockUntil = null;
    user.failedLoginAttempts = 0;
    await user.save();
    await AuthLog.create({
      userId: user._id,
      event: 'account_unlocked',
      ip: req.ip,
      details: { reason },
    });
    return res.json({ message: 'User unlocked' });
  }

  res.status(400).json({ error: 'Invalid action' });
};

/**
 * GET /admin/stats
 * return simple metrics: daily auth attempts, failure rate, active sessions
 */
export const stats = async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h
  const totalAttempts = await AuthLog.countDocuments({
    createdAt: { $gte: since },
  });
  const failures = await AuthLog.countDocuments({
    event: 'login_failure',
    createdAt: { $gte: since },
  });
  const successes = await AuthLog.countDocuments({
    event: 'login_success',
    createdAt: { $gte: since },
  });
  const activeSessions = await DeviceSession.countDocuments({
    revoked: false,
    expiresAt: { $gt: new Date() },
  });

  res.json({
    timeframe: '24h',
    totalAttempts,
    failures,
    successes,
    failureRate: totalAttempts ? failures / totalAttempts : 0,
    activeSessions,
  });
};

/**
 * GET /admin/logs/export?fmt=csv&... same filters as listAuthLogs
 */
export const exportLogs = async (req, res) => {
  const { event, userId, email, ip, from, to, fmt = 'csv' } = req.query;
  const filter = {};
  if (event) filter.event = event;
  if (userId) filter.userId = userId;
  if (email) filter.email = email;
  if (ip) filter.ip = ip;
  if (from || to) filter.createdAt = {};
  if (from) filter.createdAt.$gte = new Date(from);
  if (to) filter.createdAt.$lte = new Date(to);

  const rows = await AuthLog.find(filter).sort({ createdAt: -1 }).lean();

  if (fmt === 'json') {
    res.json(rows);
    return;
  }

  // csv
  const fields = [
    'createdAt',
    'event',
    'userId',
    'email',
    'ip',
    'userAgent',
    'details',
  ];
  const parser = new Json2csvParser({ fields });
  const csv = parser.parse(rows);
  res.header('Content-Type', 'text/csv');
  res.attachment('auth-logs.csv');
  res.send(csv);
};
