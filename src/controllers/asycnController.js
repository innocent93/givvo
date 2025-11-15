// adminControllers.js
// @ts-nocheck
import Sentry from '../config/sentry.js';
import Admin from '../models/adminModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import generateTokenAndSetCookie from '../utils/helpers/generateTokenAndSetCookie.js';
import generateCode from '../utils/generateCode.js';
import { v2 as cloudinary } from 'cloudinary';
import {
  sendVerificationEmail,
  sendTwoFactorVerificationEmail,
} from '../utils/sendEmails.js';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import AuthLog from '#src/models/AuthLog.js';
import DeviceSession from '#src/models/DeviceSession.js';
import { Parser as Json2csvParser } from 'json2csv';
import { formatAdminResponse } from '../utils/formatAdminResponse.js';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';
import Dealer from '../models/dealerModel.js';
import { catchAsync } from '../utils/catchAsync.js'; // adjust path to where you store catchAsync

// ------------------------------
// Admin / Auth flows (wrapped with catchAsync + Sentry)
// ------------------------------

export const createSuperadmin = catchAsync(async (req, res, next) => {
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

  superadmin.passwordHistory.push({
    password: superadmin.password,
    changedAt: new Date(),
  });

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
  if (adminExists) {
    return res
      .status(400)
      .json({ error: 'Admin with this email already exists' });
  }

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

  admin.passwordHistory.push({
    password: admin.password,
    changedAt: new Date(),
  });

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

    return res.json({
      message: '2FA code sent to email',
      require2FA: true,
      adminId: admin._id,
    });
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
  if (!adminId) return res.status(401).json({ msg: 'Not authenticated' });

  await Admin.findByIdAndUpdate(adminId, { loginStatus: 'Inactive' });
  res.cookie('jwt', '', { maxAge: 1 });
  res.clearCookie('adminId');
  res
    .status(200)
    .json({ msg: 'Logged out successfully', loginStatus: 'Inactive' });
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

  if (!admin || admin.isVerified) {
    return res.status(400).json({ msg: 'Admin not found or already verified' });
  }

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

  const admin = await Admin.findById(adminId).select(
    '+password +passwordHistory'
  );
  if (!admin) return res.status(404).json({ msg: 'Admin not found' });

  const isMatch = await admin.correctPassword(currentPassword);
  if (!isMatch)
    return res.status(400).json({ msg: 'Incorrect current password' });

  for (let entry of admin.passwordHistory || []) {
    const reused = await bcrypt.compare(newPassword, entry.password);
    if (reused)
      return res.status(400).json({ msg: 'Password reused from history' });
  }

  admin.password = newPassword;
  admin.passwordHistory.push({
    password: admin.password,
    changedAt: new Date(),
  });
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
  if (!isValid)
    return res.status(400).json({ message: 'Invalid or expired reset code' });

  const token = jwt.sign(
    { adminId: admin._id, purpose: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({ success: true, token, message: 'OTP verified' });
});

export const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  if (!token || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: 'Passwords do not match' });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== 'password_reset')
    return res.status(400).json({ message: 'Invalid token' });

  const admin = await Admin.findById(decoded.adminId).select(
    '+password +passwordHistory'
  );
  if (!admin) return res.status(404).json({ message: 'Admin not found' });

  if (await bcrypt.compare(newPassword, admin.password)) {
    return res
      .status(400)
      .json({ message: 'New password cannot be the same as old password' });
  }

  for (const entry of admin.passwordHistory || []) {
    if (await bcrypt.compare(newPassword, entry.password)) {
      return res
        .status(400)
        .json({ message: 'You have already used this password before' });
    }
  }

  admin.passwordHistory = admin.passwordHistory || [];
  admin.passwordHistory.push({
    password: admin.password,
    changedAt: new Date(),
  });
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
    return res
      .status(403)
      .json({ success: false, message: 'Only superadmins can delete admins' });
  }

  const { id } = req.params;
  const adminToDelete = await Admin.findById(id);
  if (!adminToDelete)
    return res.status(404).json({ success: false, message: 'Admin not found' });
  if (adminToDelete.role === 'superadmin')
    return res
      .status(403)
      .json({ success: false, message: 'Superadmins cannot be deleted' });

  await Admin.findByIdAndDelete(id);
  res
    .status(200)
    .json({ success: true, message: 'Admin deleted successfully' });
});

export const getAllUsers = catchAsync(async (req, res) => {
  const {
    email,
    name,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query;
  const filter = {};
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
  const users = await User.find(filter)
    .select(
      '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
    )
    .skip(skip)
    .limit(Number(limit))
    .sort({ [sortBy]: sortOrder });

  const total = await User.countDocuments(filter);
  if (!users || users.length === 0)
    return res.status(404).json({ error: 'No users found' });

  const formattedUsers = users.map((user, index) => {
    const userId = `#USR${String(skip + index + 1).padStart(3, '0')}`;
    let status = 'Inactive';
    if (user.isApproved) status = 'Active';
    else if (!user.isApproved && user.identityDocuments?.status === 'pending')
      status = 'Pending';

    return {
      _id: user._id,
      userId,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      profilePic: user.profilePic || '',
      accountType: user.accountType || '',
      country: user.country || '',
      state: user.state || '',
      city: user.city || '',
      dateOfBirth: user.dateOfBirth || '',
      streetAddress: user.streetAddress || '',
      zipCode: user.zipCode || '',
      loginStatus: user.loginStatus || 'Inactive',
      isVerified: user.isVerified || false,
      isApproved: user.isApproved || false,
      status,
      identityDocuments: {
        idCardFront: user.identityDocuments?.idCardFront || '',
        status: user.identityDocuments?.status || '',
        rejectionReason: user.identityDocuments?.rejectionReason || '',
        reviewedAt: user.identityDocuments?.reviewedAt || '',
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  });

  res.status(200).json({
    message: 'Users fetched successfully',
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    count: formattedUsers.length,
    users: formattedUsers,
  });
});

export const getUserById = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select(
    '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
  );
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!req.user || req.user._id.toString() !== userId) {
    if (user.loginStatus !== 'Inactive') {
      user.loginStatus = 'Inactive';
      await user.save();
    }
  }

  let status = 'Inactive';
  if (user.isApproved) status = 'Active';
  else if (!user.isApproved && user.identityDocuments?.status === 'pending')
    status = 'Pending';

  const stats = {
    totalBids: user.totalBids || 0,
    wonAuctions: user.wonAuctions || 0,
    creditLimit: user.creditLimit || 0,
    lastLogin: user.lastLogin || null,
  };

  const userDetails = {
    _id: user._id,
    userId: `#USR${String(user._id).slice(-4).toUpperCase()}`,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    username: user.username || '',
    email: user.email || '',
    phone: user.phone || '',
    dateOfBirth: user.dateOfBirth || '',
    profilePic: user.profilePic || '',
    role: user.role || '',
    status,
    loginStatus: user.loginStatus,
    isVerified: user.isVerified || false,
    isApproved: user.isApproved || false,
    address: {
      country: user.country || '',
      state: user.state || '',
      city: user.city || '',
      streetAddress: user.streetAddress || '',
      zipCode: user.zipCode || '',
    },
    accountDetails: stats,
    identityDocuments: {
      idCardFront: user.identityDocuments?.idCardFront || '',
      status: user.identityDocuments?.status || '',
      rejectionReason: user.identityDocuments?.rejectionReason || '',
      reviewedAt: user.identityDocuments?.reviewedAt || '',
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  res
    .status(200)
    .json({ message: 'User details fetched successfully', user: userDetails });
});

export const getAdminById = catchAsync(async (req, res) => {
  const { adminId } = req.params;
  const admin = await Admin.findById(adminId).select('-password -__v');
  if (!admin) return res.status(404).json({ error: 'Admin not found' });
  if (admin.role !== 'admin')
    return res
      .status(403)
      .json({ error: 'Requested ID does not belong to an Admin' });

  const adminDetails = {
    _id: admin._id,
    adminId: `#ADM${String(admin._id).slice(-4).toUpperCase()}`,
    firstName: admin.firstName || '',
    lastName: admin.lastName || '',
    fullName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim(),
    username: admin.username || '',
    email: admin.email || '',
    role: admin.role,
    loginStatus: admin.loginStatus || 'Inactive',
    isVerified: admin.isVerified || false,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };

  res.status(200).json({
    message: 'Admin details fetched successfully',
    admin: adminDetails,
  });
});

export const getSuperAdminById = catchAsync(async (req, res) => {
  const { superAdminId } = req.params;
  const superAdmin =
    await Admin.findById(superAdminId).select('-password -__v');
  if (!superAdmin)
    return res.status(404).json({ error: 'Superadmin not found' });
  if (superAdmin.role !== 'superadmin')
    return res
      .status(403)
      .json({ error: 'Requested ID does not belong to a Superadmin' });

  const superAdminDetails = {
    _id: superAdmin._id,
    superAdminId: `#SUP${String(superAdmin._id).slice(-4).toUpperCase()}`,
    firstName: superAdmin.firstName || '',
    lastName: superAdmin.lastName || '',
    fullName:
      `${superAdmin.firstName || ''} ${superAdmin.lastName || ''}`.trim(),
    username: superAdmin.username || '',
    email: superAdmin.email || '',
    profilePic: superAdmin.profilePic || '',
    role: superAdmin.role,
    loginStatus: superAdmin.loginStatus || 'Inactive',
    isVerified: superAdmin.isVerified || false,
    createdAt: superAdmin.createdAt,
    updatedAt: superAdmin.updatedAt,
  };

  res.status(200).json({
    message: 'Superadmin details fetched successfully',
    superAdmin: superAdminDetails,
  });
});

export const updateAdminProfileBySuperAdmin = catchAsync(async (req, res) => {
  const superAdminId = req.admin?._id?.toString();
  const { adminId } = req.params;

  const requester = await Admin.findById(superAdminId);
  if (!requester || requester.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Only superadmins can update admin profiles',
    });
  }

  const admin = await Admin.findById(adminId);
  if (!admin) return res.status(404).json({ message: 'Admin not found' });
  if (admin.role === 'superadmin')
    return res
      .status(403)
      .json({ message: 'Cannot update another superadmin' });

  const {
    firstName,
    lastName,
    email,
    username,
    phone,
    country,
    state,
    city,
    address,
    loginStatus,
    isVerified,
  } = req.body;

  const updatedFields = {};
  if (firstName) updatedFields.firstName = firstName;
  if (lastName) updatedFields.lastName = lastName;
  if (email) updatedFields.email = email;
  if (username) updatedFields.username = username;
  if (phone) updatedFields.phone = phone;
  if (country) updatedFields.country = country;
  if (state) updatedFields.state = state;
  if (city) updatedFields.city = city;
  if (address) updatedFields.address = address;
  if (loginStatus) updatedFields.loginStatus = loginStatus;
  if (typeof isVerified === 'boolean') updatedFields.isVerified = isVerified;

  if (Object.keys(updatedFields).length > 0) {
    Object.assign(admin, updatedFields);
    await admin.save();
  }

  res.status(200).json({
    success: true,
    message: 'Admin profile updated successfully',
    updatedAdmin: {
      _id: admin._id,
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      username: admin.username || '',
      email: admin.email || '',
      phone: admin.phone || '',
      country: admin.country || '',
      state: admin.state || '',
      city: admin.city || '',
      address: admin.address || '',
      loginStatus: admin.loginStatus,
      isVerified: admin.isVerified,
      role: admin.role,
      updatedAt: admin.updatedAt,
    },
  });
});

export const updateOwnProfilePhoto = catchAsync(async (req, res) => {
  const { id } = req.params;
  const requesterId = req.admin._id.toString();
  const requesterRole = req.admin.role;

  if (!req.file)
    return res.status(400).json({ message: 'No profile photo uploaded!' });
  if (id !== requesterId)
    return res
      .status(403)
      .json({ message: 'You can only update your own profile photo' });

  const admin = await Admin.findById(id);
  if (!admin) return res.status(404).json({ message: 'Admin not found' });

  admin.profilePic = req.file.path;
  await admin.save();

  res.status(200).json({
    success: true,
    message: `${requesterRole} profile photo updated successfully`,
    profilePic: admin.profilePic,
  });
});

export const listAuthLogs = catchAsync(async (req, res) => {
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
});

export const listSessions = catchAsync(async (req, res) => {
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
});

export const revokeSession = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?._id;

  const session = await DeviceSession.findById(id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.revoked)
    return res.status(400).json({ error: 'Already revoked' });

  session.revoked = true;
  session.revokedAt = new Date();
  session.revokedBy = adminId;
  await session.save();

  await AuthLog.create({
    userId: session.userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    event: 'remember_me_revoked',
    details: { sessionId: session._id, revokedBy: adminId },
  });

  res.json({ message: 'Revoked', sessionId: session._id });
});

export const lockUnlockUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (action === 'lock') {
    user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
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
});

export const stats = catchAsync(async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
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
});

export const exportLogs = catchAsync(async (req, res) => {
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
});

// authControllers.js
// @ts-nocheck
import Sentry from '../config/sentry.js';
import User from '../models/userModel.js';
import speakeasy from 'speakeasy';
import bcrypt from 'bcryptjs';
import generateTokenAndSetCookie from '../utils/helpers/generateTokenAndSetCookie.js';
import { v2 as cloudinary } from 'cloudinary';
import generateCode from '../utils/generateCode.js';
import { verifyRecaptcha } from '#src/utils/recaptcha.js';
import {
  createRememberMe,
  validateRememberMe,
  hashToken,
} from '#src/utils/remember.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTwoFactorVerificationEmail,
} from '../utils/sendEmails.js';
import jwt from 'jsonwebtoken';
import { catchAsync } from '../utils/catchAsync.js'; // adjust path

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FAILED = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

export const register = catchAsync(async (req, res) => {
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

  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ error: 'User already exists' });

  const code = generateCode();

  const newUser = new User({
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
    emailCode: code,
    emailCodeExpires: Date.now() + 10 * 60 * 1000,
    passwordHistory: [{ password, changedAt: new Date() }],
    isVerified: false,
    onboardingCompleted: false,
  });

  await newUser.save();
  await sendVerificationEmail(email, code);

  generateTokenAndSetCookie(newUser._id, res);

  res.status(201).json({
    _id: newUser._id,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    username: newUser.username,
    email: newUser.email,
    phone: newUser.phone,
    state: newUser.state,
    city: newUser.city,
    address: newUser.address,
    role: newUser.role,
    msg: 'User registered. Verification code sent to email.',
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

  if (!user.twoFA) {
    user.twoFA = { enabled: false, emailCode: null, emailCodeExpires: null };
    await user.save();
  }

  const isPasswordCorrect = await user.correctPassword(password);
  if (!isPasswordCorrect)
    return res.status(400).json({ error: 'Invalid password' });

  if (!user.isVerified) {
    const code = generateCode();
    user.emailCode = code;
    user.emailCodeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    await sendVerificationEmail(email, code);
    const token = generateTokenAndSetCookie(user._id, res, 'userId');

    return res.status(200).json({
      msg: 'Account not verified. A new verification code has been sent.',
      isVerified: false,
      token,
      userId: user._id,
    });
  }

  if (user.twoFA?.enabled) {
    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    user.twoFA.emailCode = code;
    user.twoFA.emailCodeExpires = expires;
    await user.save();
    await sendTwoFactorVerificationEmail(email, code);

    return res.json({
      message: '2FA code sent to email',
      require2FA: true,
      userId: user._id,
    });
  }

  user.lastLogin = new Date();
  user.loginStatus = 'Active';
  await user.save();

  const token = generateTokenAndSetCookie(user._id, res, 'userId');

  return res.status(200).json({
    token,
    _id: user._id,
    email: user.email,
    msg: 'Login Successful',
    isVerified: true,
    role: user.role,
    lastLogin: user.lastLogin,
    loginStatus: user.loginStatus,
    isApproved: user.isApproved,
    twoFA: user.twoFA?.enabled,
    documentStatus: user.identityDocuments?.status,
    onboardingCompleted: user.onboardingCompleted,
  });
});

export const verifyLogin2FA = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { code } = req.body;

  const user = await User.findById(userId);
  if (!user || !user.twoFA?.enabled)
    return res.status(400).json({ error: '2FA not enabled' });

  if (new Date() > user.twoFA.emailCodeExpires)
    return res.status(400).json({ error: 'Code expired' });
  if (user.twoFA.emailCode !== code)
    return res.status(400).json({ error: 'Invalid code' });

  user.twoFA.emailCode = undefined;
  user.twoFA.emailCodeExpires = undefined;
  await user.save();

  const token = generateTokenAndSetCookie(user._id, res, 'userId');
  res.json({ token, user });
});

export const logoutUser = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ msg: 'Not authenticated' });

  await User.findByIdAndUpdate(userId, { loginStatus: 'Inactive' });
  res.cookie('jwt', '', { maxAge: 1 });
  res.clearCookie('userId');
  res
    .status(200)
    .json({ msg: 'Logged out successfully', loginStatus: 'Inactive' });
});

export const verifyEmail = catchAsync(async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.isVerified)
    return res.status(400).json({ msg: 'Invalid request' });
  if (user.emailCode !== code || Date.now() > user.emailCodeExpires)
    return res.status(400).json({ msg: 'Code expired or incorrect' });

  user.isVerified = true;
  user.emailCode = null;
  user.emailCodeExpires = null;
  await user.save();

  res.json({ msg: 'Email verified successfully' });
});

export const verifyPasswordResetCode = catchAsync(async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: 'Invalid request' });

  // note: original code had a typo reseCodeExpires -> resetCodeExpires
  if (user.resetCode !== code || Date.now() > user.resetCodeExpires)
    return res.status(400).json({ msg: 'Code expired or incorrect' });

  user.resetCode = null;
  user.resetCodeExpires = null;
  await user.save();

  res.json({ msg: 'code verified successfully' });
});

export const resendCode = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.isVerified)
    return res.status(400).json({ msg: 'User not found or already verified' });

  const code = generateCode();
  user.emailCode = code;
  user.emailCodeExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendVerificationEmail(email, code);
  res.json({ msg: 'New verification code sent' });
});

export const changePassword = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (newPassword !== confirmNewPassword)
    return res.status(400).json({ message: 'Passwords do not match' });

  const user = await User.findById(userId).select('+password +passwordHistory');
  if (!user) return res.status(404).json({ message: 'User not found' });

  const validCurrent = await user.correctPassword(currentPassword);
  if (!validCurrent)
    return res.status(400).json({ message: 'Incorrect current password' });

  for (let entry of user.passwordHistory || []) {
    const reused = await bcrypt.compare(newPassword, entry.password);
    if (reused)
      return res
        .status(400)
        .json({ message: 'You cannot reuse an old password' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password changed successfully' });
});

export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: 'Email not found' });

  const code = user.setPasswordResetCode();
  await user.save({ validateBeforeSave: false });

  await sendPasswordResetEmail(email, code);
  res.json({ msg: 'Password reset code sent' });
});

export const verifyResetCode = catchAsync(async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });
  if (!user || !user.validateResetCode(code))
    return res.status(400).json({ message: 'Invalid/expired OTP' });

  const token = jwt.sign(
    { userId: user._id, purpose: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  res.json({ success: true, token, message: 'OTP verified' });
});

export const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: 'Passwords do not match' });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== 'password_reset')
    return res.status(400).json({ message: 'Invalid token' });

  const user = await User.findById(decoded.userId).select(
    '+password +passwordHistory'
  );
  if (!user) return res.status(404).json({ message: 'User not found' });

  for (let entry of user.passwordHistory || []) {
    const reused = await bcrypt.compare(newPassword, entry.password);
    if (reused)
      return res
        .status(400)
        .json({ message: 'You cannot reuse an old password' });
  }

  user.password = newPassword;
  user.resetCode = undefined;
  user.resetCodeExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully' });
});

export const uploadDocuments = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const requiredFields = ['idCardFront'];
  let uploadedCount = 0;

  requiredFields.forEach(field => {
    if (req.files && req.files[field] && req.files[field][0]) {
      user.identityDocuments[field] = req.files[field][0].path;
      uploadedCount++;
    }
  });

  const missingDocs = requiredFields.filter(
    field => !user.identityDocuments[field]
  );
  if (missingDocs.length > 0) {
    return res
      .status(400)
      .json({ error: `Missing required documents: ${missingDocs.join(', ')}` });
  }

  if (typeof user.resetDocumentsIfRejected === 'function') {
    user.resetDocumentsIfRejected();
  }

  user.identityDocuments.status = 'pending';
  user.identityDocuments.uploadedAt = new Date();
  user.onboardingStage = 'terms';

  await user.save();

  res.json({
    message:
      'All required documents uploaded successfully. Proceed to Terms & Conditions.',
    step: user.onboardingStage,
    documents: user.identityDocuments,
  });
});

export const acceptTerms = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { acceptedTerms, acceptedPrivacy } = req.body;

  if (req.user._id.toString() !== userId)
    return res.status(403).json({ error: 'Unauthorized action' });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!acceptedTerms || !acceptedPrivacy)
    return res
      .status(400)
      .json({ error: 'You must accept both Terms and Privacy Policy' });

  const { idCardFront } = user.identityDocuments || {};
  if (!idCardFront)
    return res
      .status(400)
      .json({
        error:
          'You must upload all required document (ID card) before accepting terms.',
      });

  user.acceptedTerms = true;
  user.acceptedPrivacy = true;
  user.onboardingStage = 'admin_review';
  await user.save();

  const safeUser = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    onboardingStage: user.onboardingStage,
    acceptedTerms: user.acceptedTerms,
    acceptedPrivacy: user.acceptedPrivacy,
    identityDocuments: {
      status: user.identityDocuments.status,
      reviewedAt: user.identityDocuments.reviewedAt,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  res.json({
    message:
      'Terms and privacy accepted successfully ✅. Awaiting Admin Approval',
    step: user.onboardingStage,
    user: safeUser,
  });
});

export const totpSetup = catchAsync(async (req, res) => {
  const secret = speakeasy.generateSecret({ length: 20 });
  res.json({ otpauth_url: secret.otpauth_url, base32: secret.base32 });
});

export const totpEnable = catchAsync(async (req, res) => {
  const { userId, base32, code } = req.body;
  const ok = speakeasy.totp.verify({
    secret: base32,
    encoding: 'base32',
    token: code,
  });
  if (!ok) return res.status(400).json({ error: 'INVALID_TOTP' });
  await User.updateOne(
    { _id: userId },
    { $set: { 'twoFA.totpEnabled': true, 'twoFA.totpSecretEncrypted': base32 } }
  );
  res.json({ ok: true });
});
