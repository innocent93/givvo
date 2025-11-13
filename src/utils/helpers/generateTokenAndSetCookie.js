// @ts-nocheck
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

/**
 * @param {string} id - The unique identifier for the user/dealer/admin
 * @param {object} res - Express response object
 * @param {string} role - Role-based identifier key e.g., "userId", "dealerId", "adminId"
 */
const generateTokenAndSetCookie = (id, res, role = 'userId') => {
  const payload = { [role]: id }; // dynamically set the payload key

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '15d',
  });

  res.cookie('jwt', token, {
    httpOnly: true,
    maxAge: 15 * 24 * 60 * 60 * 1000,
    sameSite: 'strict',
  });

  return token;
};

export default generateTokenAndSetCookie;
