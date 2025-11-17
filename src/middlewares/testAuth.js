// src/middlewares/testAuth.js
/**
 * testAuth middleware — TEST ONLY
 *
 * Usage:
 * - In tests you can set header `x-test-adminid` (or `x-test-admin-email`)
 *   to instruct this middleware to populate req.admin with the admin doc
 *   loaded from the DB. This lets controller-level protected routes see
 *   req.admin and behave as if a real auth check passed.
 *
 * - This middleware should only be enabled when NODE_ENV === 'test'.
 *
 * WARNING: Do NOT enable this middleware in production.
 */

import AdminModel from '../models/adminModel.js';

export default async function testAuth(req, res, next) {
  try {
    // Only active in test env — double-check at runtime too
    if (process.env.NODE_ENV !== 'test') return next();

    const headerAdminId = req.get('x-test-adminid');
    const headerAdminEmail = req.get('x-test-admin-email');

    if (!headerAdminId && !headerAdminEmail) return next();

    // Try load by id first, else by email.
    let admin = null;
    if (headerAdminId) {
      try {
        admin = await AdminModel.findById(headerAdminId);
      } catch (e) {
        // ignore invalid id format
        admin = null;
      }
    }
    if (!admin && headerAdminEmail) {
      admin = await AdminModel.findOne({ email: headerAdminEmail });
    }

    if (admin) {
      // Attach sanitized admin object to req (mimic your real auth middleware)
      // Keep only fields controllers expect (e.g. _id, role)
      req.admin = {
        _id: admin._id,
        role: admin.role,
        email: admin.email,
      };
    }
    return next();
  } catch (err) {
    // never block tests on middleware errors
    // eslint-disable-next-line no-console
    console.error('testAuth middleware error:', err);
    return next();
  }
}
