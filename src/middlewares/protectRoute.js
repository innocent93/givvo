// @ts-nocheck
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const protectRoute = async (req, res, next) => {
  try {
    let token =
      req.cookies?.jwt || req.header('Authorization')?.replace('Bearer ', '');

    if (!token)
      return res
        .status(401)
        .json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔑 Make sure token has userId
    if (!decoded.userId)
      return res
        .status(403)
        .json({ message: 'Invalid token: not a User token' });

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    req.user = user; // ✅ attach logged-in user
    next();
  } catch (err) {
    console.error('JWT Error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export default protectRoute;
