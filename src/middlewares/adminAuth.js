// @ts-nocheck
import jwt from 'jsonwebtoken';
import Admin from '../models/adminModel.js';
import dotenv from 'dotenv';
dotenv.config();

export const protectAdmin = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token, not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ because you used role="adminId" when creating token
    const adminId = decoded.adminId;
    if (!adminId) {
      return res.status(401).json({ msg: 'Invalid token: admin ID missing' });
    }

    const admin = await Admin.findById(adminId).select('-password');
    if (!admin) {
      return res.status(401).json({ msg: 'Admin not found' });
    }

    req.admin = admin; // ✅ attach admin to request
    next();
  } catch (err) {
    console.error('protectAdmin error:', err);
    res.status(401).json({ msg: 'Token failed' });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    next();
  };
};
