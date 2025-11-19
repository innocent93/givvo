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
  sendTwoFactorVerificationEmail,
  sendEmail,
  sendPasswordUpdatedEmail,
} from '../utils/sendEmails.js';
// controllers/adminAuthController.js
import AdminSession from "../models/AdminSession.js";
import AdminActivityLog from "../models/AdminActivityLog.js";
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import AuthLog from '#src/models/AuthLog.js';
import DeviceSession from '#src/models/DeviceSession.js';
import { Parser as Json2csvParser } from 'json2csv';

import { formatAdminResponse } from '../utils/formatAdminResponse.js';

// Alternative: Use busboy for proper multipart streaming

import { Parser } from 'json2csv';

import ExcelJS from 'exceljs';


// In-memory session store (use Redis in production)

// Auth Controllsers
// ========================

// export const createSuperadmin = async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       username,
//       email,
//       password,
//       phone,
//       state,
//       city,
//       streetAddress,
//       zipCode,
//       dateOfBirth,
//     } = req.body;

//     // ✅ Validate required fields
//     if (
//       !firstName ||
//       !lastName ||
//       !email ||
//       !password ||
//       !phone ||
//       !state ||
//       !city ||
//       !streetAddress ||
//       !dateOfBirth
//     ) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     // ✅ Check if a superadmin already exists
//     const superadminExists = await Admin.findOne({ role: "superadmin" });
//     if (superadminExists) {
//       return res
//         .status(400)
//         .json({ error: "Superadmin already exists. You cannot create another one." });
//     }

//     // ✅ Check if email already used
//     const adminExists = await Admin.findOne({ email });
//     if (adminExists) {
//       return res.status(400).json({ error: "Email already in use" });
//     }

//     // ✅ Generate verification code
//     const code = generateCode();

//     // ✅ Force role = superadmin
//     const superadmin = new Admin({
//       firstName,
//       lastName,
//       email,
//       password,
//       phone,
//       state,
//       city,
//       streetAddress,
//       zipCode,
//       dateOfBirth,
//       role: "superadmin", // 👈 enforce
//       emailCode: code,
//       emailCodeExpires: Date.now() + 10 * 60 * 1000,
//       passwordHistory: [],
//       isVerified: false,
//     });

//     // ✅ Store initial password hash in history
//     superadmin.passwordHistory.push({
//       password: superadmin.password,
//       changedAt: new Date(),
//     });

//     await superadmin.save();

//     // ✅ Send verification email
//     await sendVerificationEmail(email, code);

//     // ✅ Generate login token
//     const token = generateTokenAndSetCookie(superadmin._id, res, "adminId");

//     res.status(201).json({
//       token,
//       ...formatAdminResponse(superadmin),
//       msg: "Superadmin registered. Verification code sent to email.",
//     });
//   } catch (err) {
//     console.error("Error creating superadmin:", err.message);
//     res.status(500).json({ error: err.message });
//   }
// };

export const createSuperadmin = async (req, res) => {
  try {
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

    // ✅ Validate required fields
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

    // ❌ REMOVE this check (was blocking multiple superadmins)
    // const superadminExists = await Admin.findOne({ role: "superadmin" });
    // if (superadminExists) {
    //   return res
    //     .status(400)
    //     .json({ error: "Superadmin already exists. You cannot create another one." });
    // }

    // ✅ Check if email already used
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // ✅ Generate verification code
    const code = generateCode();

    // ✅ Always assign role = superadmin
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
      role: 'superadmin', // 👈 enforce
      emailCode: code,
      emailCodeExpires: Date.now() + 10 * 60 * 1000,
      passwordHistory: [],
      isVerified: false,
    });

    // ✅ Store initial password hash in history
    superadmin.passwordHistory.push({
      password: superadmin.password,
      changedAt: new Date(),
    });

    await superadmin.save();

    // ✅ Send verification email
    await sendVerificationEmail(email, code);

    // ✅ Generate login token
    const token = generateTokenAndSetCookie(superadmin._id, res, 'adminId');

    res.status(201).json({
      token,
      ...formatAdminResponse(superadmin),
      msg: 'Superadmin registered successfully. Verification code sent to email.',
    });
  } catch (err) {
    console.error('Error creating superadmin:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const createAdmin = async (req, res) => {
  try {
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

    // 1. Required fields check
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

    // 2. Ensure logged-in user is superadmin
    if (!req.admin || req.admin.role !== 'superadmin') {
      return res
        .status(403)
        .json({ error: 'Only superadmin can create admins' });
    }

    // 3. Prevent duplicate email
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res
        .status(400)
        .json({ error: 'Admin with this email already exists' });
    }

    // 4. Generate email verification code
    const code = generateCode();

    // 5. Create admin (force role = admin)
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
      role: 'admin', // 🔒 enforce role
      emailCode: code,
      emailCodeExpires: Date.now() + 10 * 60 * 1000,
      passwordHistory: [],
      isVerified: false,
    });

    // Track password history
    admin.passwordHistory.push({
      password: admin.password,
      changedAt: new Date(),
    });

    await admin.save();

    // Send email verification
    await sendVerificationEmail(email, code);

    // Optional: don’t log in new admins automatically
    res.status(201).json({
      ...formatAdminResponse(admin),
      msg: 'Admin created successfully. Verification code sent to email.',
    });
  } catch (err) {
    console.error('Error creating admin:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin || !(await admin.correctPassword(password))) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // ⭐ Fix: Initialize missing twoFA for older admins
    if (!admin.twoFA) {
      admin.twoFA = {
        enabled: false,
        emailCode: null,
        emailCodeExpires: null,
      };
      await admin.save();
    }

    if (!admin.isVerified) {
      const code = generateCode();
      admin.emailCode = code;
      admin.emailCodeExpires = Date.now() + 10 * 60 * 1000;
      await admin.save();
      // ✅ Branded resend
      await sendVerificationEmail(email, code);
      return res.status(403).json({
        msg: 'Account not verified. New verification code sent.',
        isVerified: false,
        // token,
        adminId: admin._id,
      });
    }

    if (admin.twoFA?.enabled) {
      // Send a new code for login confirmation
      // const code = crypto.randomInt(100000, 999999).toString();
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

    // Update login status and last login time
    admin.loginStatus = 'Active';
    admin.lastLogin = new Date();
    await admin.save();

    const token = generateTokenAndSetCookie(admin._id, res, 'adminId');
    res.status(200).json({
      token,
      ...formatAdminResponse(admin),
      msg: `${admin.role} login successful`, // 👈 dynamic message
      isVerified: true,
    });
  } catch (error) {
    console.error('Error in loginAdmin:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// export const logoutUser = (req, res) => {
//   try {
//     res.cookie("jwt", "", { maxAge: 1 });
//     res.status(200).json({ message: "User logged out successfully" });
//   } catch (err) {
//     console.error("Logout error:", err.message);
//     res.status(500).json({ error: err.message });
//   }
// };
export const logoutUser = async (req, res) => {
  try {
    if (!req.admin._id) {
      return res.status(401).json({ error: 'Unauthorized: admin not found' });
    }

    const adminId = req.admin._id;

    await Admin.findByIdAndUpdate(adminId, { loginStatus: 'Inactive' });

    res.clearCookie('jwt');
    res.cookie('jwt', '', { maxAge: 1 });
    res.clearCookie('adminId');

    return res.status(200).json({
      msg: 'Logged out successfully',
      loginStatus: 'Inactive',
    });
  } catch (err) {
    console.error('Error in logout:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const resendCode = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin || admin.isVerified)
      return res
        .status(400)
        .json({ msg: 'Admin not found or already verified' });

    const code = generateCode();
    admin.emailCode = code;
    admin.emailCodeExpires = Date.now() + 10 * 60 * 1000;
    await admin.save();

    // ✅ Use new helper
    await sendVerificationEmail(email, code);
    res.json({ msg: 'New verification code sent' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ msg: 'Passwords do not match' });
    }

    // ⚠️ Need the password to verify
    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ msg: 'Admin not found' });

    // Verify current password
    const isMatch = await admin.correctPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Incorrect current password' });
    }

    // Prevent reuse (check against history)
    for (let entry of admin.passwordHistory) {
      const reused = await bcrypt.compare(newPassword, entry.password);
      if (reused) {
        return res.status(400).json({ msg: 'Password reused from history' });
      }
    }

    // Update password
    admin.password = newPassword;

    // Push new password hash to history
    admin.passwordHistory.push({
      password: admin.password,
      changedAt: new Date(),
    });
    if (admin.passwordHistory.length > 5) admin.passwordHistory.shift();

    await admin.save();

    await sendPasswordUpdatedEmail(admin.email, admin.firstName);
    res.json({ msg: 'Password changed successfully' });
  } catch (err) {
    console.error('Error in changePassword:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// =============================
// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) return res.status(400).json({ message: 'Email not found' });

    const code = admin.setPasswordResetCode();
    await admin.save({ validateBeforeSave: false });

    // Send the raw code via email
    await sendPasswordResetEmail(admin.email, code);

    res.json({ success: true, message: 'Password reset code sent' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// VERIFY RESET CODE
export const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    const isValid = admin.validateResetCode(code);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Generate short-lived JWT (15 mins expiry)
    const token = jwt.sign(
      { adminId: admin._id, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ success: true, token, message: 'OTP verified' });
  } catch (err) {
    console.error('verifyResetCode error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // Find admin
    const admin = await Admin.findById(decoded.adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    // Prevent password reuse
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

    // Save old password to history
    admin.passwordHistory = admin.passwordHistory || [];
    admin.passwordHistory.push({
      password: admin.password,
      changedAt: new Date(),
    });
    if (admin.passwordHistory.length > 5) {
      admin.passwordHistory.shift();
    }

    // Assign new password
    admin.password = newPassword;

    // Clear reset codes
    admin.resetCode = undefined;
    admin.resetCodeExpires = undefined;

    await admin.save();
    await sendPasswordUpdatedEmail(admin.email, admin.firstName);

    res.json({ success: true, message: 'Password updated successfully ✅' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token expired' });
    }
    console.error('resetPassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

//get all admin users
export const getAdminUser = async (req, res) => {
  try {
    const admin = await Admin.find({ role: 'admin' });
    res.status(200).json(admin);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAdminById = async (req, res) => {
  try {
    const requester = req.admin._id; // logged-in admin from auth middleware
    const { adminId } = req.params;

    // 1️⃣ Ensure requester is superadmin
    if (!requester || requester.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can delete admins',
      });
    }

    // 2️⃣ Prevent deleting self
    if (requester._id.toString() === adminId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete yourself',
      });
    }

    // 3️⃣ Find admin to delete
    const adminToDelete = await Admin.findById(adminId);

    if (!adminToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // 4️⃣ Prevent deleting another superadmin
    if (adminToDelete.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete a superadmin',
      });
    }

    // 5️⃣ Perform delete
    await Admin.findByIdAndDelete(adminId);

    return res.status(200).json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const {
      email,
      name,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    // 🔍 Build filter
    let filter = {};
    // if (role) filter.role = role;
    if (email) filter.email = { $regex: email, $options: 'i' };
    if (name) {
      filter.$or = [
        { firstName: { $regex: name, $options: 'i' } },
        { lastName: { $regex: name, $options: 'i' } },
        { username: { $regex: name, $options: 'i' } },
      ];
    }

    // Pagination setup
    const skip = (Number(page) - 1) * Number(limit);

    // Sorting setup
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    // Fetch users
    const users = await User.find(filter)
      .select(
        '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
      )
      .skip(skip)
      .limit(Number(limit))
      .sort(sortOptions);

    const total = await User.countDocuments(filter);

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'No users found' });
    }

    // Format response
    const formattedUsers = users.map((user, index) => {
      // Generate a simple userId like #USR001
      const userId = `#USR${String(skip + index + 1).padStart(3, '0')}`;

      // Compute status
      let status = 'Inactive';
      if (user.isApproved) status = 'Active';
      else if (
        !user.isApproved &&
        user.identityDocuments?.status === 'pending'
      ) {
        status = 'Pending';
      }

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
        role: user.role || '',
        country: user.country || '',
        state: user.state || '',
        city: user.city || '',
        location: user.location || '',
        dateOfBirth: user.dateOfBirth || '',
        streetAddress: user.streetAddress || '',
        zipCode: user.zipCode || '',
        loginStatus: user.loginStatus || 'Inactive',
        isVerified: user.isVerified || false,
        isApproved: user.isApproved || false,
        status,
        identityDocuments: {
          idCardFront: user.identityDocuments?.idCardFront || '',
          // photo: user.identityDocuments?.photo || "",
          // tin: user.identityDocuments?.tin || "",
          // cac: user.identityDocuments?.cac || "",
          // bankStatement: user.identityDocuments?.bankStatement || "",
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
  } catch (err) {
    console.error('Error in getAllUsers:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

/**
 * Get a single user by ID
 * Admin view: includes profile info, account details, documents, stats, etc.
 * Excludes sensitive data like passwords & reset codes.
 */
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ✅ If token expired or user logged out manually
    if (!req.user || req.user._id.toString() !== userId) {
      // mark as Inactive
      if (user.loginStatus !== 'Inactive') {
        user.loginStatus = 'Inactive';
        await user.save();
      }
    }

    // Compute status
    let status = 'Inactive';
    if (user.isApproved) status = 'Active';
    else if (!user.isApproved && user.identityDocuments?.status === 'pending') {
      status = 'Pending';
    }

    // Example stats (optional)
    const stats = {
      totalBids: user.totalBids || 0,
      wonAuctions: user.wonAuctions || 0,
      creditLimit: user.creditLimit || 0,
      lastLogin: user.lastLogin || null,
    };

    // Format response
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
      loginStatus: user.loginStatus, // ✅ always up to date
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
        // photo: user.identityDocuments?.photo || "",
        // tin: user.identityDocuments?.tin || "",
        // cac: user.identityDocuments?.cac || "",
        // bankStatement: user.identityDocuments?.bankStatement || "",
        // proofOfAddress: user.identityDocuments?.proofOfAddress || "",
        status: user.identityDocuments?.status || '',
        rejectionReason: user.identityDocuments?.rejectionReason || '',
        reviewedAt: user.identityDocuments?.reviewedAt || '',
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      message: 'User details fetched successfully',
      user: userDetails,
    });
  } catch (err) {
    console.error('Error in getUserById:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

export const getAdminById = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId).select('-password -__v');

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // ✅ Ensure it's not a superadmin (so this route fetches only admins)
    if (admin.role !== 'admin') {
      return res.status(403).json({
        error: 'Requested ID does not belong to an Admin',
      });
    }

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

    return res.status(200).json({
      message: 'Admin details fetched successfully',
      admin: adminDetails,
    });
  } catch (err) {
    console.error('Error in getAdminById:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// controllers/adminController.js
export const getSuperAdminById = async (req, res) => {
  try {
    const { superAdminId } = req.params;

    const superAdmin =
      await Admin.findById(superAdminId).select('-password -__v');

    if (!superAdmin) {
      return res.status(404).json({ error: 'Superadmin not found' });
    }

    // ✅ Ensure role is superadmin
    if (superAdmin.role !== 'superadmin') {
      return res.status(403).json({
        error: 'Requested ID does not belong to a Superadmin',
      });
    }

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

    return res.status(200).json({
      message: 'Superadmin details fetched successfully',
      superAdmin: superAdminDetails,
    });
  } catch (err) {
    console.error('Error in getSuperAdminById:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

export const updateAdminProfileBySuperAdmin = async (req, res) => {
  try {
    const superAdminId = req.admin?._id?.toString(); // from auth middleware
    const { adminId } = req.params;

    // ✅ Ensure requester is a superadmin
    const requester = await Admin.findById(superAdminId);
    if (!requester || requester.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can update admin profiles',
      });
    }

    // ✅ Ensure target exists
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // ❌ Prevent updating another superadmin
    if (admin.role === 'superadmin') {
      return res
        .status(403)
        .json({ message: 'Cannot update another superadmin' });
    }

    // ✅ Allowed update fields
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

    // ✅ Apply updates
    if (Object.keys(updatedFields).length > 0) {
      Object.assign(admin, updatedFields);
      await admin.save();
    }

    return res.status(200).json({
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
  } catch (err) {
    console.error('Error updating admin profile:', err);
    res.status(500).json({ error: err.message });
  }
};
//update photo of either superadmi or admin
export const updateOwnProfilePhoto = async (req, res) => {
  try {
    const { id } = req.params; // from route param
    const requesterId = req.admin._id.toString(); // logged-in admin id
    const requesterRole = req.admin.role; // "admin" or "superadmin"

    if (!req.file) {
      return res.status(400).json({ message: 'No profile photo uploaded!' });
    }

    // ✅ Check if the ID belongs to the logged-in user
    if (id !== requesterId) {
      return res.status(403).json({
        message: 'You can only update your own profile photo',
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // ✅ Save Cloudinary URL
    admin.profilePic = req.file.path;
    await admin.save();

    res.status(200).json({
      success: true,
      message: `${requesterRole} profile photo updated successfully`,
      profilePic: admin.profilePic,
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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
  const { userId } = req.params;
  const adminId = req.user._id;

  const session = await DeviceSession.findById(userId);
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

export const logoutAdmin = async (req, res) => {
  try {
    // The admin is injected into req.admin by your auth middleware
    const adminId = req.admin?._id;

    if (!adminId) {
      return res.status(401).json({ msg: 'Not authenticated' });
    }

    // Mark all active sessions as inactive
    await AdminSession.updateMany(
      { adminId, isActive: true },
      {
        isActive: false,
        logoutAt: new Date(),
      }
    );

    res.cookie('jwt', '', { maxAge: 1 });
    
    // Clear JWT cookie
    res.clearCookie('adminId', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    // Log the logout event
    await AdminActivityLog.create({
      adminId,
      action: 'LOGOUT',
      description: 'Admin logged out of dashboard',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ msg: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ msg: 'Server error' });
  }
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

// Helper: check admin role
const requireAdmin = admin => {
  if (!admin || !['admin', 'superadmin'].includes(admin.role)) {
    return false;
  }
  return true;
};

// // 1️⃣ BAN USER (Permanent block, cannot login)
// export const banUser = async (req, res) => {
//   try {
//     const admin = req.admin._id;
//     const { userId } = req.params;

//     if (!requireAdmin(admin)) {
//       return res.status(403).json({ message: 'Unauthorized' });
//     }

//     const user = await User.findByIdAndUpdate(
//       userId,
//       { status: 'banned' },
//       { new: true }
//     );

//     if ( !user ) return res.status( 404 ).json( { message: 'User not found' } );
    
//     // user.status = 'banned';
//     user.bannedAt = new Date();
//     user.suspensionExpiry = null;
//     user.frozenUntil = null;
//     await user.save();

//      await AdminActivityLog.create({
//        adminId: req.admin._id,
//        action: 'BAN_USER',
//        targetUserId: user._id,
//        description: `User ${user.email} was permanently banned.`,
//      } );
    
//      await sendEmail(
//        user.email,
//        'Your account has been banned',
//        `<p>Hello ${user.name},<br>Your account has been permanently banned.</p>`
//      );

//     return res.status(200).json({
//       message: 'User has been banned permanently',
//       user,
//     });
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// };

// 2️⃣ SUSPEND USER (Temporary block, admin must set up a reactivation later)
// export const suspendUser = async (req, res) => {
//   try {
//     const admin = req.admin._id;
//     const { userId } = req.params;
//     const { days } = req.body;

//     if (!requireAdmin(admin)) {
//       return res.status(403).json({ message: 'Unauthorized' });
//     }

//     const user = await User.findByIdAndUpdate(
//       userId,
//       { status: 'suspended' },
//       { new: true }
//     );

//     if ( !user ) return res.status( 404 ).json( { message: 'User not found' } );
    
//     const expiry = new Date();
//     expiry.setDate( expiry.getDate() + days );
    
//     // user.status = 'suspended';
//     user.suspensionExpiry = expiry;
//     await user.save();

//     await AdminActivityLog.create({
//       adminId: req.admin._id,
//       action: 'SUSPEND_USER',
//       targetUserId: user._id,
//       description: `User suspended for ${days} days`,
//     } );
    
//     await sendEmail(
//       user.email,
//       'Your account has been suspended',
//       `<p>Hello ${user.name},<br>
//       Your account has been suspended for <b>${days} days</b><br>
//       Until: ${expiry}</p>`
//     );

//     return res.status(200).json({
//       message: 'User has been suspended',
//       user,
//       expiry,
//     });
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// };
// controllers/adminUserController.js


// -------------------------------
// Helper: Update User Status
// -------------------------------
async function updateUserStatus(userId, statusData) {
  const user = await User.findById(userId);
  if (!user) return null;

  Object.assign(user, statusData);
  await user.save();
  return user;
}

// -------------------------------
// BAN USER (Permanent)
// -------------------------------
export const banUser = async (req, res) => {
  try {
    const admin = req.admin._id;
    const { userId } = req.params;

    // if (!requireAdmin(admin)) {
    //   return res.status(403).json({ message: 'Unauthorized' });
    // }

    const user = await updateUserStatus(userId, {
      status: 'banned',
      bannedAt: new Date(),
      suspensionExpiry: null,
      frozenUntil: null,
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    await AdminActivityLog.create({
      adminId: admin,
      action: 'BAN_USER',
      targetUserId: user._id,
      description: `User ${user.email} was permanently banned.`,
    });

    await sendEmail(
      user.email,
      'Your Account Has Been Banned',
      `<p>Hello ${user.name},<br>Your account has been permanently banned.</p>`
    );

    return res.status(200).json({
      message: 'User has been permanently banned',
      user,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// UNBAN USER
// -------------------------------
export const unbanUser = async (req, res) => {
  try {
    const admin = req.admin._id;
    const { userId } = req.params;

    if (!requireAdmin(admin)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const user = await updateUserStatus(userId, {
      status: 'active',
      bannedAt: null,
      suspensionExpiry: null,
      frozenUntil: null,
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    await AdminActivityLog.create({
      adminId: admin,
      action: 'UNBAN_USER',
      targetUserId: user._id,
      description: `User ${user.email} was unbanned.`,
    });

    await sendEmail(
      user.email,
      'Your Account Has Been Restored',
      `<p>Hello ${user.name},<br>Your account has been unbanned and access restored.</p>`
    );

    return res.status(200).json({
      message: 'User has been unbanned successfully',
      user,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// ------------------------------------
// SUSPEND USER (Temporary)
// ------------------------------------
export const suspendUser = async (req, res) => {
  try {
    const admin = req.admin._id;
    const { userId } = req.params;
    const { days } = req.body;

    if (!requireAdmin(admin)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + Number(days));

    const user = await updateUserStatus(userId, {
      status: 'suspended',
      suspensionExpiry: expiry,
      frozenUntil: null,
      bannedAt: null,
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    await AdminActivityLog.create({
      adminId: admin,
      action: 'SUSPEND_USER',
      targetUserId: user._id,
      description: `User suspended for ${days} days.`,
    });

    await sendEmail(
      user.email,
      'Your Account Has Been Suspended',
      `<p>Hello ${user.name},<br>
        Your account has been suspended for <b>${days} days</b>.<br>
        Suspension Expires On: <b>${expiry.toUTCString()}</b>
      </p>`
    );

    return res.status(200).json({
      message: 'User has been suspended',
      user,
      expiry,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ------------------------------------
// UNSUSPEND USER (Manual Restore)
// ------------------------------------
export const unsuspendUser = async (req, res) => {
  try {
    const admin = req.admin._id;
    const { userId } = req.params;

    if (!requireAdmin(admin)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const user = await updateUserStatus(userId, {
      status: 'active',
      suspensionExpiry: null,
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    await AdminActivityLog.create({
      adminId: admin,
      action: 'UNSUSPEND_USER',
      targetUserId: user._id,
      description: `User was manually unsuspended.`,
    });

    await sendEmail(
      user.email,
      'Your Account Has Been Restored',
      `<p>Hello ${user.name},<br>Your account has been unsuspended and access restored.</p>`
    );

    return res.status(200).json({
      message: 'User has been unsuspended',
      user,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// 3️⃣ FREEZE USER ACCOUNT (Funds locked, login allowed, but no transactions)
export const freezeUserAccount = async (req, res) => {
  try {
    const admin = req.admin._id;
    const { userId } = req.params;
    const { days } = req.body; // expiry e.g. 7 days

    if (!requireAdmin(admin)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status: 'frozen' },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });


    const freezeUntil = new Date();
    freezeUntil.setDate( freezeUntil.getDate() + days );
    
    //  user.status = 'frozen';
    user.frozenUntil = freezeUntil;
    await user.save();
    
    await AdminActivityLog.create({
       adminId: req.admin._id,
       action: 'FREEZE_USER',
       targetUserId: user._id,
       description: `User frozen for ${days} days`,
     } );
    
    await sendEmail(
      user.email,
      'Your account has been frozen',
      `<p>Hello ${user.name},<br>
      Your account has been frozen until <b>${freezeUntil}</b>.</p>`
    );

    
    return res.status(200).json({
      message: 'User account has been frozen',
      user,
      freezeUntil,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 4️⃣ DELETE USER PERMANENTLY (Cannot be undone)
export const deleteUserPermanently = async (req, res) => {
  try {
    const admin = req.admin._id;
    const { userId } = req.params;

    if (!requireAdmin(admin)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const user = await User.findByIdAndDelete( userId );
    
    await AdminActivityLog.create({
      adminId: req.admin._id,
      action: 'DELETE_USER',
      targetUserId: user._id,
      description: `User permanently deleted`,
    } );
    
     await sendEmail(
       user.email,
       'Account Deleted',
       `<p>Your account has been permanently deleted from our system.</p>`
     );

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({
      message: 'User has been permanently deleted',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};




