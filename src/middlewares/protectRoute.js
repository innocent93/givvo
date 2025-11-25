// @ts-nocheck
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const protectRoute = async (req, res, next) => {
  try {
    // ------------------------------------------
    // 1. Extract token from cookie or Authorization header
    // ------------------------------------------
    let token =
      req.cookies?.jwt || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        message: 'Authorization denied. Token missing.',
      });
    }

    // ------------------------------------------
    // 2. Verify token
    // ------------------------------------------
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Expected: { userId, iat, exp }
    if (!decoded || !decoded.userId) {
      return res.status(403).json({
        message: 'Invalid token structure.',
      });
    }

    // ------------------------------------------
    // 3. Fetch user + include passwordChangedAt
    // ------------------------------------------
    const user = await User.findById(decoded.userId).select(
      '-password +passwordChangedAt'
    );

    if (!user) {
      return res.status(404).json({
        message: 'User belonging to this token no longer exists.',
      });
    }

    // ------------------------------------------
    // 4. Invalidate token if password changed after JWT was issued
    // ------------------------------------------
    if (user.passwordChangedAt) {
      const passwordChangedTimestamp = parseInt(
        user.passwordChangedAt.getTime() / 1000,
        10
      );

      if (decoded.iat < passwordChangedTimestamp) {
        return res.status(401).json({
          message:
            'Session expired. Password was changed recently. Please log in again.',
        });
      }
    }

    // ------------------------------------------
    // 5. Attach current user to request
    // ------------------------------------------
    req.user = user;

    next();
  } catch (err) {
    console.error('ProtectRoute Error:', err);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired. Please log in again.',
      });
    }

    return res.status(401).json({
      message: 'Invalid or malformed token.',
    });
  }
};

export default protectRoute;

// // @ts-nocheck
// import User from '../models/userModel.js';
// import jwt from 'jsonwebtoken';
// import dotenv from 'dotenv';
// dotenv.config();

// const protectRoute = async (req, res, next) => {
//   try {
//     let token =
//       req.cookies?.jwt || req.header('Authorization')?.replace('Bearer ', '');

//     if (!token)
//       return res
//         .status(401)
//         .json({ message: 'No token, authorization denied' });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // 🔑 Make sure token has userId
//     if (!decoded.userId)
//       return res
//         .status(403)
//         .json({ message: 'Invalid token: not a User token' });

//     const user = await User.findById(decoded.userId).select('-password');
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     req.user = user; // ✅ attach logged-in user
//     next();
//   } catch (err) {
//     console.error('JWT Error:', err.message);
//     return res.status(401).json({ message: 'Invalid or expired token' });
//   }
// };

// export default protectRoute;
