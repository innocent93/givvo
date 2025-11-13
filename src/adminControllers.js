// @ts-nocheck
import Admin from '../models/adminModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import generateTokenAndSetCookie from '../utils/helpers/generateTokenAndSetCookie.js';
import { v2 as cloudinary } from 'cloudinary';
import generateCode from '../utils/generateCode.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendApprovalEmail,
  sendRejectionEmail,
} from '../utils/sendEmails.js';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Vehicle from '../models/Vehicle.js';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { formatAdminResponse } from '../utils/formatAdminResponse.js';

// Alternative: Use busboy for proper multipart streaming
import busboy from 'busboy';
import Dealer from '../models/dealerModel.js';

import { Parser } from 'json2csv';

import ExcelJS from 'exceljs';
// import Dealer from "../models/dealerModel.js";

// In-memory session store (use Redis in production)
const resetSessions = new Map();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to safely format admin response
// Utility to format safe response
// const formatAdminResponse = (admin) => ({
//   _id: admin._id,
//   firstName: admin.firstName || "",
//   lastName: admin.lastName || "",
//   email: admin.email || "",
//   phone: admin.phone || "",
//   state: admin.state || "",
//   city: admin.city || "",
//   streetAddress: admin.streetAddress || "",
//   zipCode: admin.zipCode || "",
//   dateOfBirth: admin.dateOfBirth || "",
//   role: admin.role || "",
//   profilePic: admin.profilePic || "",
//   isVerified: admin.isVerified || false,
// });

// Auth Controllsers
// ========================

// export const createSuperadmin = async (req, res) => {
//   try {
//     const {
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
      });
    }

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
    const admiId = req.admin._id; // assuming you attach user from token middleware
    await Admin.findByIdAndUpdate(adminId, { loginStatus: 'Inactive' });
    res.cookie('jwt', '', { maxAge: 1 });
    res.clearCookie('adminId'); // remove token cookie
    res
      .status(200)
      .json({ msg: 'Logged out successfully', loginStatus: 'Inactive' });
  } catch (err) {
    console.error('Error in logout:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getUserProfile = async (req, res) => {
  const { query } = req.params;
  try {
    let user;
    if (mongoose.Types.ObjectId.isValid(query)) {
      user = await Admin.findById(query).select('-password -updatedAt');
    } else {
      user = await Admin.findOne({ username: query }).select(
        '-password -updatedAt'
      );
    }

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    console.error('getUserProfile error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const updateAdmin = async (req, res) => {
  const { firstName, lastName, email, phone, country } = req.body;
  // let { logo } = req.body;
  const adminId = req.admin._id;

  try {
    let admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    if (req.params.id !== adminId.toString()) {
      return res.status(403).json({ error: 'Unauthorized update' });
    }

    // if (profilePic && admin.profilePic) {
    //   await cloudinary.uploader.destroy(user.profilePic.split("/").pop().split(".")[0]);
    // }

    // const uploadedPic = profilePic
    //   ? (await cloudinary.uploader.upload(profilePic)).secure_url
    //   : user.profilePic;

    Object.assign(admin, {
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      email: email || user.email,
      phone: phone || user.phone,
      country: country || user.country,
      // profilePic: uploadedPic,
    });

    await admin.save();
    res.status(200).json({
      _id: admin._id,
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      email: admin.email || '',
      phone: admin.phone || '',
      country: admin.country || '',
      role: admin.role || '',
      profilePic: admin.profilePic || '',
      isVerified: admin.isVerified || false,
    });
  } catch (err) {
    console.error('updateUser error:', err.message);
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

// ✅ Get all uploaded documents for a specific user
export const getUserDocuments = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      'firstName lastName email identityDocuments onboardingStage isApproved'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User documents retrieved successfully',
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        documents: user.identityDocuments,
        onboardingStage: user.onboardingStage,
        isApproved: user.isApproved,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Approve user documents
// ✅ Approve user documents
// ✅ Approve user documents
export const approveUserDocuments = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select(
      '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    const { idCardFront } = user.identityDocuments;

    if (!idCardFront) {
      return res.status(400).json({
        error:
          'Cannot approve user documents. All required documents must be uploaded before approval.',
      });
    }

    user.identityDocuments.status = 'approved';
    user.identityDocuments.reviewedAt = new Date();
    user.identityDocuments.rejectionReason = null;
    user.isApproved = true;
    user.onboardingStage = 'completed';

    await user.save();

    // // ✅ Clean response object (remove sensitive fields)
    // const safeUser = user.toObject();
    // delete safeUser.password;
    // delete safeUser.passwordHistory;

    // ✅ Use uniform email helper
    await sendApprovalEmail(user.email, user.firstName);

    //  // ✅ Clean response object (remove sensitive fields)
    // const safeUser = user.toObject();
    // delete safeUser.password;
    // delete safeUser.passwordHistory;

    res.json({
      message: 'User documents approved successfully ✅',
      step: user.onboardingStage,
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const approveDealerDocuments = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const dealer = await Dealer.findById(dealerId).select(
      '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
    );

    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

    const { idCardFront, dealerCertificate, cac } = dealer.identityDocuments;

    if (!idCardFront || !dealerCertificate || !cac) {
      return res.status(400).json({
        error:
          'Cannot approve dealer documents. All required documents must be uploaded before approval.',
      });
    }

    dealer.identityDocuments.status = 'approved';
    dealer.identityDocuments.reviewedAt = new Date();
    dealer.identityDocuments.rejectionReason = null;
    dealer.isApproved = true;
    dealer.onboardingStage = 'completed';

    await dealer.save();

    // ✅ Use uniform email helper
    await sendApprovalEmail(dealer.email, dealer.firstName);

    // // ✅ Clean response object (remove sensitive fields)
    // const safeUser = dealer.toObject();
    // delete safeUser.password;
    // delete safeUser.passwordHistory;

    res.json({
      message: 'Dealer documents approved successfully ✅',
      step: dealer.onboardingStage,
      dealer,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Reject user documents by admin
export const rejectUserDocuments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rejectionReason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    user.identityDocuments.status = 'rejected';
    user.identityDocuments.reviewedAt = new Date();
    user.identityDocuments.rejectionReason = rejectionReason;
    user.isApproved = false;
    user.onboardingStage = 'documents';

    await user.save();

    // ✅ Use uniform email helper
    await sendRejectionEmail(user.email, user.firstName, rejectionReason);

    res.json({
      message: 'User documents rejected ❌',
      reason: user.identityDocuments.rejectionReason,
      step: user.onboardingStage,
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Reject user documents
export const rejectDealerDocuments = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const { rejectionReason } = req.body;

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    dealer.identityDocuments.status = 'rejected';
    dealer.identityDocuments.reviewedAt = new Date();
    dealer.identityDocuments.rejectionReason = rejectionReason;
    dealer.isApproved = false;
    dealer.onboardingStage = 'documents';

    await dealer.save();

    // ✅ Use uniform email helper
    await sendRejectionEmail(dealer.email, dealer.firstName, rejectionReason);

    res.json({
      message: 'Dealer documents rejected ❌',
      reason: dealer.identityDocuments.rejectionReason,
      step: dealer.onboardingStage,
      dealer,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ List all users with pending documentss
export const getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await User.find({
      'identityDocuments.status': 'pending',
    }).select('firstName lastName email identityDocuments createdAt');

    res.json({
      message: 'Pending users retrieved successfully',
      count: pendingUsers.length,
      users: pendingUsers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPendingDealers = async (req, res) => {
  try {
    const pendingDealers = await Dealer.find({
      'identityDocuments.status': 'pending',
    }).select('firstName lastName email identityDocuments createdAt');

    res.json({
      message: 'Pending users retrieved successfully',
      count: pendingDealers.length,
      dealers: pendingDealers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteAdminById = async (req, res) => {
  try {
    // ✅ Check if requester is superadmin
    if (req.admin?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can delete admins',
      });
    }

    const { id } = req.params;

    // ✅ Prevent deleting another superadmin
    const adminToDelete = await Admin.findById(id);
    if (!adminToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    if (adminToDelete.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Superadmins cannot be deleted',
      });
    }

    // ✅ Delete admin
    await Admin.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete admin',
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
        // role: user.role || "",
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

export const getAllDealers = async (req, res) => {
  try {
    const {
      email,
      name,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

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

    const dealers = await Dealer.find(filter)
      .select(
        '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
      )
      .skip(skip)
      .limit(Number(limit))
      .sort(sortOptions);

    const total = await Dealer.countDocuments(filter);

    if (!dealers || dealers.length === 0) {
      return res.status(404).json({ error: 'No users found' });
    }

    // ✅ Fix: use `dealer` instead of `user`
    const formattedDealers = dealers.map((dealer, index) => {
      const dealerId = `#DEA${String(skip + index + 1).padStart(3, '0')}`;

      let status = 'Inactive';
      if (dealer.isApproved) status = 'Active';
      else if (
        !dealer.isApproved &&
        dealer.identityDocuments?.status === 'pending'
      ) {
        status = 'Pending';
      }

      return {
        _id: dealer._id,
        dealerId,
        firstName: dealer.firstName || '',
        lastName: dealer.lastName || '',
        username: dealer.username || '',
        email: dealer.email || '',
        phone: dealer.phone || '',
        profilePic: dealer.profilePic || '',
        accountType: dealer.accountType || '',
        country: dealer.country || '',
        state: dealer.state || '',
        city: dealer.city || '',
        dateOfBirth: dealer.dateOfBirth || '',
        streetAddress: dealer.streetAddress || '',
        zipCode: dealer.zipCode || '',
        loginStatus: dealer.loginStatus || 'Inactive',
        isVerified: dealer.isVerified || false,
        isApproved: dealer.isApproved || false,
        status,
        identityDocuments: {
          idCardFront: dealer.identityDocuments?.idCardFront || '',
          status: dealer.identityDocuments?.status || '',
          rejectionReason: dealer.identityDocuments?.rejectionReason || '',
          reviewedAt: dealer.identityDocuments?.reviewedAt || '',
        },
        createdAt: dealer.createdAt,
        updatedAt: dealer.updatedAt,
      };
    });

    res.status(200).json({
      message: 'Dealers fetched successfully',
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      count: formattedDealers.length,
      dealers: formattedDealers,
    });
  } catch (err) {
    console.error('Error in getAllDealers:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

export const getAllAccounts = async (req, res) => {
  try {
    const {
      type,
      email,
      name,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    let filter = {};
    if (type) filter.type = type;
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

    // Fetch Users
    const usersPromise = User.find(filter)
      .select(
        '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
      )
      .sort(sortOptions);

    // Fetch Dealers
    const dealersPromise = Dealer.find(filter)
      .select(
        '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
      )
      .sort(sortOptions);

    const [users, dealers] = await Promise.all([usersPromise, dealersPromise]);

    // 🔑 Tag each record with its type
    const usersTagged = users.map(u => ({ ...u.toObject(), type: 'Retailer' }));
    const dealersTagged = dealers.map(d => ({
      ...d.toObject(),
      type: 'Dealer',
    }));

    // Merge results
    let allAccounts = [...usersTagged, ...dealersTagged];

    // Sort merged list manually
    allAccounts = allAccounts.sort((a, b) => {
      return order === 'asc'
        ? new Date(a[sortBy]) - new Date(b[sortBy])
        : new Date(b[sortBy]) - new Date(a[sortBy]);
    });

    // Paginate after merge
    const total = allAccounts.length;
    const paginatedAccounts = allAccounts.slice(skip, skip + Number(limit));

    // Format response
    const formatted = paginatedAccounts.map((acc, index) => {
      const accountId = `#USR${String(skip + index + 1).padStart(3, '0')}`;

      let status = 'Inactive';
      if (acc.isApproved) status = 'Active';
      else if (!acc.isApproved && acc.identityDocuments?.status === 'pending') {
        status = 'Pending';
      }

      return {
        _id: acc._id,
        accountId,
        firstName: acc.firstName,
        lastName: acc.lastName,
        email: acc.email,
        phone: acc.phone,
        type: acc.type, // 👈 clearly shows Retailer or Dealer
        profilePic: acc.profilePic,
        status,
        isVerified: acc.isVerified,
        isApproved: acc.isApproved,
        loginStatus: acc.loginStatus,
        createdAt: acc.createdAt,
        identityDocuments: acc.identityDocuments,
      };
    });

    res.status(200).json({
      message: 'Accounts fetched successfully',
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      count: formatted.length,
      accounts: formatted,
    });
  } catch (err) {
    console.error('Error in getAllAccounts:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

export const exportAccountsCSV = async (req, res) => {
  try {
    // Fetch all users and dealers
    const [users, dealers] = await Promise.all([
      User.find().select(
        '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
      ),
      Dealer.find().select(
        '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
      ),
    ]);

    const allAccounts = [...users, ...dealers];

    // Flatten and format for CSV
    const formatted = allAccounts.map((acc, idx) => ({
      accountId: `#USR${String(idx + 1).padStart(3, '0')}`,
      firstName: acc.firstName || '',
      lastName: acc.lastName || '',
      email: acc.email || '',
      phone: acc.phone || '',
      role: acc.role || '',
      accountType: acc.accountType || '',
      status: acc.isApproved ? 'Active' : 'Pending/Inactive',
      isVerified: acc.isVerified ? 'Yes' : 'No',
      loginStatus: acc.loginStatus || 'Inactive',
      createdAt: acc.createdAt ? acc.createdAt.toISOString() : '',
      lastLogin: acc.lastLogin ? acc.lastLogin.toISOString() : '',
    }));

    // Fields for CSV
    const fields = [
      'accountId',
      'firstName',
      'lastName',
      'email',
      'phone',
      'role',
      'accountType',
      'status',
      'isVerified',
      'loginStatus',
      'createdAt',
      'lastLogin',
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formatted);

    // Set headers for download
    res.header('Content-Type', 'text/csv');
    res.attachment('accounts_export.csv');
    return res.send(csv);
  } catch (err) {
    console.error('Error exporting accounts CSV:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

export const exportAccountsExcel = async (req, res) => {
  try {
    // Fetch users + dealers
    const [users, dealers] = await Promise.all([
      User.find().select(
        '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
      ),
      Dealer.find().select(
        '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
      ),
    ]);

    const allAccounts = [...users, ...dealers];

    // Create workbook + worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Accounts');

    // Define columns
    worksheet.columns = [
      { header: 'Account ID', key: 'accountId', width: 12 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Account Type', key: 'accountType', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Verified', key: 'isVerified', width: 10 },
      { header: 'Login Status', key: 'loginStatus', width: 12 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Last Login', key: 'lastLogin', width: 20 },
    ];

    // Add rows
    allAccounts.forEach((acc, idx) => {
      worksheet.addRow({
        accountId: `#USR${String(idx + 1).padStart(3, '0')}`,
        firstName: acc.firstName || '',
        lastName: acc.lastName || '',
        email: acc.email || '',
        phone: acc.phone || '',
        role: acc.role || '',
        accountType: acc.accountType || '',
        status: acc.isApproved ? 'Active' : 'Pending/Inactive',
        isVerified: acc.isVerified ? 'Yes' : 'No',
        loginStatus: acc.loginStatus || 'Inactive',
        createdAt: acc.createdAt ? acc.createdAt.toISOString() : '',
        lastLogin: acc.lastLogin ? acc.lastLogin.toISOString() : '',
      });
    });

    // Style header row
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF007ACC' }, // Blue header
      };
    });

    // Send as download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=accounts_export.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting Excel:', err.message);
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

export const getDealerById = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const dealer = await Dealer.findById(dealerId).select(
      '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
    );

    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    // ✅ If token expired or user logged out manually
    if (!req.dealer || req.dealer._id.toString() !== dealerId) {
      // mark as Inactive
      if (dealer.loginStatus !== 'Inactive') {
        dealer.loginStatus = 'Inactive';
        await dealer.save();
      }
    }

    // Compute status
    let status = 'Inactive';
    if (dealer.isApproved) status = 'Active';
    else if (
      !dealer.isApproved &&
      dealer.identityDocuments?.status === 'pending'
    ) {
      status = 'Pending';
    }

    // Example stats (optional)
    const stats = {
      totalBids: dealer.totalBids || 0,
      wonAuctions: dealer.wonAuctions || 0,
      creditLimit: dealer.creditLimit || 0,
      lastLogin: dealer.lastLogin || null,
    };

    // Format response
    const dealerDetails = {
      _id: dealer._id,
      dealerId: `#DEA${String(dealer._id).slice(-4).toUpperCase()}`,
      firstName: dealer.firstName || '',
      lastName: dealer.lastName || '',
      fullName: `${dealer.firstName || ''} ${dealer.lastName || ''}`.trim(),
      username: dealer.username || '',
      email: dealer.email || '',
      phone: dealer.phone || '',
      dateOfBirth: dealer.dateOfBirth || '',
      profilePic: dealer.profilePic || '',
      role: dealer.role || '',
      status,
      loginStatus: dealer.loginStatus, // ✅ always up to date
      isVerified: dealer.isVerified || false,
      isApproved: dealer.isApproved || false,
      address: {
        country: dealer.country || '',
        state: dealer.state || '',
        city: dealer.city || '',
        streetAddress: dealer.streetAddress || '',
        zipCode: dealer.zipCode || '',
      },
      accountDetails: stats,
      identityDocuments: {
        idCardFront: dealer.identityDocuments?.idCardFront || '',
        dealerCertificate: dealer.identityDocuments?.dealerCertificate || '',
        // tin: dealer.identityDocuments?.tin || "",
        cac: dealer.identityDocuments?.cac || '',
        // bankStatement: dealer.identityDocuments?.bankStatement || "",
        // proofOfAddress: dealer.identityDocuments?.proofOfAddress || "",
        status: dealer.identityDocuments?.status || '',
        rejectionReason: dealer.identityDocuments?.rejectionReason || '',
        reviewedAt: dealer.identityDocuments?.reviewedAt || '',
      },
      createdAt: dealer.createdAt,
      updatedAt: dealer.updatedAt,
    };

    res.status(200).json({
      message: 'Dealer details fetched successfully',
      dealer: dealerDetails,
    });
  } catch (err) {
    console.error('Error in getDealerById:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

/**
 * Promote User → Dealer
 */
export const promoteUserToDealer = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // Create Dealer from User data
    const dealer = new Dealer({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.password, // already hashed
      phone: user.phone,
      state: user.state,
      city: user.city,
      streetAddress: user.streetAddress,
      zipCode: user.zipCode,
      dateOfBirth: user.dateOfBirth,
      profilePic: user.profilePic,
      acceptedTerms: user.acceptedTerms,
      acceptedPrivacy: user.acceptedPrivacy,
      onboardingCompleted: user.onboardingCompleted,
      onboardingStage: user.onboardingStage,
      identityDocuments: user.identityDocuments,
      isVerified: user.isVerified,
      isApproved: false, // must go through admin approval again
      requiresDocument: true,
      loginStatus: user.loginStatus,
      lastLogin: user.lastLogin,
      // passwordHistory: user.passwordHistory,
    });

    await dealer.save();

    // Remove from User collection (optional)
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User promoted to Dealer successfully',
      dealer,
    });
  } catch (error) {
    console.error('❌ Error promoting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to promote user',
      error: error.message,
    });
  }
};

/**
 * Demote Dealer → User
 */
export const demoteDealerToUser = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
      return res
        .status(404)
        .json({ success: false, message: 'Dealer not found' });
    }

    // Create User from Dealer data
    const user = new User({
      firstName: dealer.firstName,
      lastName: dealer.lastName,
      email: dealer.email,
      password: dealer.password, // already hashed
      phone: dealer.phone,
      state: dealer.state,
      city: dealer.city,
      streetAddress: dealer.streetAddress,
      zipCode: dealer.zipCode,
      dateOfBirth: dealer.dateOfBirth,
      profilePic: dealer.profilePic,
      acceptedTerms: dealer.acceptedTerms,
      acceptedPrivacy: dealer.acceptedPrivacy,
      onboardingCompleted: dealer.onboardingCompleted,
      onboardingStage: dealer.onboardingStage,
      identityDocuments: dealer.identityDocuments,
      isVerified: dealer.isVerified,
      isApproved: dealer.isApproved,
      requiresDocument: false,
      loginStatus: dealer.loginStatus,
      lastLogin: dealer.lastLogin,
      // passwordHistory: dealer.passwordHistory,
    });

    await user.save();

    // Remove from Dealer collection (optional)
    await Dealer.findByIdAndDelete(dealerId);

    res.status(200).json({
      success: true,
      message: 'Dealer demoted to User successfully',
      user,
    });
  } catch (error) {
    console.error('❌ Error demoting dealer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to demote dealer',
      error: error.message,
    });
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
