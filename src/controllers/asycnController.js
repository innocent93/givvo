// controllers/adminControllers.js
// @ts-nocheck
import Admin from '../models/adminModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import generateTokenAndSetCookie from '../utils/helpers/generateTokenAndSetCookie.js';
import generateCode from '../utils/generateCode.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendTwoFactorVerificationEmail,
} from '../utils/sendEmails.js';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import AuthLog from '#src/models/AuthLog.js';
import DeviceSession from '#src/models/DeviceSession.js';
import { Parser as Json2csvParser } from 'json2csv';
import { formatAdminResponse } from '../utils/formatAdminResponse.js';
import Dealer from '../models/dealerModel.js';
import ExcelJS from 'exceljs';
import { catchAsync } from '../utils/catchAsync.js';

// -------------------- Admin flows --------------------

export const createSuperadmin = catchAsync(async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    phone,
    state,
    city,
    streetAddress,
    zipCode,
    dateOfBirth,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !username ||
    !email ||
    !password ||
    !phone ||
    !state ||
    !city ||
    !streetAddress ||
    !dateOfBirth
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const adminExists = await Admin.findOne({ email });
  if (adminExists) {
    return res.status(400).json({ error: 'Email already in use' });
  }

  const code = generateCode();

  const superadmin = new Admin({
    firstName,
    lastName,
    username,
    email,
    password,
    phone,
    state,
    city,
    streetAddress,
    zipCode,
    dateOfBirth,
    role: 'superadmin',
    emailCode: code,
    emailCodeExpires: Date.now() + 10 * 60 * 1000,
    passwordHistory: [],
    isVerified: false,
  });

  superadmin.passwordHistory.push({ password: superadmin.password, changedAt: new Date() });
  await superadmin.save();

  await sendVerificationEmail(email, code);

  const token = generateTokenAndSetCookie(superadmin._id, res, 'adminId');

  res.status(201).json({
    token,
    ...formatAdminResponse(superadmin),
    msg: 'Superadmin registered successfully. Verification code sent to email.',
  });
});

export const createAdmin = catchAsync(async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    phone,
    state,
    city,
    streetAddress,
    zipCode,
    dateOfBirth,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !username ||
    !email ||
    !password ||
    !phone ||
    !state ||
    !city ||
    !streetAddress ||
    !dateOfBirth
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!req.admin || req.admin.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only superadmin can create admins' });
  }

  const adminExists = await Admin.findOne({ email });
  if (adminExists) return res.status(400).json({ error: 'Admin with this email already exists' });

  const code = generateCode();

  const admin = new Admin({
    firstName,
    lastName,
    username,
    email,
    password,
    phone,
    state,
    city,
    streetAddress,
    zipCode,
    dateOfBirth,
    role: 'admin',
    emailCode: code,
    emailCodeExpires: Date.now() + 10 * 60 * 1000,
    passwordHistory: [],
    isVerified: false,
  });

  admin.passwordHistory.push({ password: admin.password, changedAt: new Date() });
  await admin.save();

  await sendVerificationEmail(email, code);

  res.status(201).json({
    ...formatAdminResponse(admin),
    msg: 'Admin created successfully. Verification code sent to email.',
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });

  if (!admin || !(await admin.correctPassword(password))) {
    return res.status(400).json({ msg: 'Invalid credentials' });
  }

  if (!admin.twoFA) {
    admin.twoFA = { enabled: false, emailCode: null, emailCodeExpires: null };
    await admin.save();
  }

  if (!admin.isVerified) {
    const code = generateCode();
    admin.emailCode = code;
    admin.emailCodeExpires = Date.now() + 10 * 60 * 1000;
    await admin.save();
    await sendVerificationEmail(email, code);
    return res.status(403).json({
      msg: 'Account not verified. New verification code sent.',
      isVerified: false,
      adminId: admin._id,
    });
  }

  if (admin.twoFA?.enabled) {
    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    admin.twoFA.emailCode = code;
    admin.twoFA.emailCodeExpires = expires;
    await admin.save();
    await sendTwoFactorVerificationEmail(email, code);
    return res.json({ message: '2FA code sent to email', require2FA: true, adminId: admin._id });
  }

  admin.loginStatus = 'Active';
  admin.lastLogin = new Date();
  await admin.save();

  const token = generateTokenAndSetCookie(admin._id, res, 'adminId');

  res.status(200).json({
    token,
    ...formatAdminResponse(admin),
    msg: `${admin.role} login successful`,
    isVerified: true,
  });
});

export const logoutUser = catchAsync(async (req, res) => {
  const adminId = req.admin?._id;
  if (!adminId) {
    // If not authenticated, respond 401
    return res.status(401).json({ msg: 'Not authenticated' });
  }

  await Admin.findByIdAndUpdate(adminId, { loginStatus: 'Inactive' });
  res.cookie('jwt', '', { maxAge: 1 });
  res.clearCookie('adminId');
  res.status(200).json({ msg: 'Logged out successfully', loginStatus: 'Inactive' });
});

export const verifyEmail = catchAsync(async (req, res) => {
  const { email, code } = req.body;
  const admin = await Admin.findOne({ email });

  if (!admin || admin.isVerified) {
    return res.status(400).json({ msg: 'Invalid request' });
  }

  if (admin.emailCode !== code || Date.now() > admin.emailCodeExpires) {
    return res.status(400).json({ msg: 'Code expired or incorrect' });
  }

  admin.isVerified = true;
  admin.emailCode = null;
  admin.emailCodeExpires = null;
  await admin.save();

  res.json({ msg: 'Email verified successfully' });
});

export const resendCode = catchAsync(async (req, res) => {
  const { email } = req.body;
  const admin = await Admin.findOne({ email });

  if (!admin || admin.isVerified) return res.status(400).json({ msg: 'Admin not found or already verified' });

  const code = generateCode();
  admin.emailCode = code;
  admin.emailCodeExpires = Date.now() + 10 * 60 * 1000;
  await admin.save();

  await sendVerificationEmail(email, code);
  res.json({ msg: 'New verification code sent' });
});

export const changePassword = catchAsync(async (req, res) => {
  const adminId = req.admin._id;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ msg: 'Passwords do not match' });
  }

  const admin = await Admin.findById(adminId).select('+password +passwordHistory');
  if (!admin) return res.status(404).json({ msg: 'Admin not found' });

  const isMatch = await admin.correctPassword(currentPassword);
  if (!isMatch) return res.status(400).json({ msg: 'Incorrect current password' });

  for (let entry of admin.passwordHistory || []) {
    const reused = await bcrypt.compare(newPassword, entry.password);
    if (reused) return res.status(400).json({ msg: 'Password reused from history' });
  }

  admin.password = newPassword;
  admin.passwordHistory.push({ password: admin.password, changedAt: new Date() });
  if (admin.passwordHistory.length > 5) admin.passwordHistory.shift();

  await admin.save();
  res.json({ msg: 'Password changed successfully' });
});

export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const admin = await Admin.findOne({ email });

  if (!admin) return res.status(400).json({ message: 'Email not found' });

  const code = admin.setPasswordResetCode();
  await admin.save({ validateBeforeSave: false });

  await sendPasswordResetEmail(admin.email, code);
  res.json({ success: true, message: 'Password reset code sent' });
});

export const verifyResetCode = catchAsync(async (req, res) => {
  const { email, code } = req.body;
  const admin = await Admin.findOne({ email });

  if (!admin) return res.status(400).json({ message: 'Invalid email' });

  const isValid = admin.validateResetCode(code);
  if (!isValid) return res.status(400).json({ message: 'Invalid or expired reset code' });

  const token = jwt.sign({ adminId: admin._id, purpose: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
  res.json({ success: true, token, message: 'OTP verified' });
});

export const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  if (!token || !newPassword || !confirmPassword) return res.status(400).json({ message: 'All fields are required' });
  if (newPassword !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== 'password_reset') return res.status(400).json({ message: 'Invalid token' });

  const admin = await Admin.findById(decoded.adminId).select('+password +passwordHistory');
  if (!admin) return res.status(404).json({ message: 'Admin not found' });

  if (await bcrypt.compare(newPassword, admin.password)) {
    return res.status(400).json({ message: 'New password cannot be the same as old password' });
  }

  for (const entry of admin.passwordHistory || []) {
    if (await bcrypt.compare(newPassword, entry.password)) {
      return res.status(400).json({ message: 'You have already used this password before' });
    }
  }

  admin.passwordHistory = admin.passwordHistory || [];
  admin.passwordHistory.push({ password: admin.password, changedAt: new Date() });
  if (admin.passwordHistory.length > 5) admin.passwordHistory.shift();

  admin.password = newPassword;
  admin.resetCode = undefined;
  admin.resetCodeExpires = undefined;
  await admin.save();

  res.json({ success: true, message: 'Password updated successfully ✅' });
});

export const getAdminUser = catchAsync(async (req, res) => {
  const admin = await Admin.find({ role: 'admin' });
  res.status(200).json(admin);
});

export const deleteAdminById = catchAsync(async (req, res) => {
  if (req.admin?.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Only superadmins can delete admins' });
  }

  const { id } = req.params;
  const adminToDelete = await Admin.findById(id);
  if (!adminToDelete) return res.status(404).json({ success: false, message: 'Admin not found' });
  if (adminToDelete.role === 'superadmin') return res.status(403).json({ success: false, message: 'Superadmins cannot be deleted' });

  await Admin.findByIdAndDelete(id);
  res.status(200).json({ success: true, message: 'Admin deleted successfully' });
});

export const getAllUsers = catchAsync(async (req, res) => {
  const { email, name, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

  let filter = {};
  if (email) filter.email = { $regex: email, $options: 'i' };
  if (name) {
    filter.$or = [
      { firstName: { $regex: name, $options: 'i' } },
      { lastName: { $regex: name, $options: 'i' } },
      { username: { $regex: name, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sortOrder = order === 'asc' ? 1 : -1;
  const sortOptions = { [sortBy]: sortOrder };

  const users = await User.find(filter)
    .select('-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v')
    .skip(skip)
    .limit(Number(limit))
    .sort(sortOptions);

  const total = await User.countDocuments(filter);
  if (!users || users.length === 0) return res.status(404).json({ error: 'No users found' });

  const formattedUsers = users.map((user, index) => {
    const userId = `#USR${String(skip + index + 1).padStart(3, '0')}`;
    let status = 'Inactive';
    if (user.isApproved) status = 'Active';
    else if (!user.isApproved && user.identityDocuments?.status === 'pending') status = 'Pending';

    return {
      _id: user._id,
      userId,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user
