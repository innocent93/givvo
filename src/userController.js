// @ts-nocheck
import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import generateTokenAndSetCookie from '../utils/helpers/generateTokenAndSetCookie.js';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import generateCode from '../utils/generateCode.js';
// import {sendEmail} from "../utils/sendEmails.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendApprovalEmail,
  sendRejectionEmail,
} from '../utils/sendEmails.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// In-memory session store (use Redis in production)
const resetSessions = new Map();

// Generate session token
const generateSessionToken = () => crypto.randomBytes(32).toString('hex');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =============================
// GET USER PROFILE
// =============================
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const user = await User.findById(id).select(
      '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Response with defaults
    const userResponse = {
      _id: user._id,
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
      streetAddress: user.streetAddress || '',
      zipCode: user.zipCode || '',
      isVerified: user.isVerified || false,
      isApproved: user.isApproved || false,
      identityDocuments: {
        idCardFront: user.identityDocuments?.idCardFront || '',
        // photo: user.identityDocuments?.photo || "",
        status: user.identityDocuments?.status || '',
        rejectionReason: user.identityDocuments?.rejectionReason || '',
        reviewedAt: user.identityDocuments?.reviewedAt || '',
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      message: 'User profile fetched successfully',
      user: userResponse,
    });
  } catch (err) {
    console.error('Error in getUserProfile:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// =============================
// REGISTER
// =============================
const register = async (req, res) => {
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

    // Validate required fields
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

    // if (!acceptedTerms || !acceptedPrivacy) {
    // 	return res.status(400).json({ message: "You must accept the Terms & Conditions and Privacy Policy" });
    // }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ error: 'User already exists' });

    // Generate email verification code
    const code = generateCode();

    // Create user (default role = "user")
    const newUser = new User({
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
      // default role
      // acceptedTerms,
      // acceptedPrivacy,
      emailCode: code,
      emailCodeExpires: Date.now() + 10 * 60 * 1000,
      // passwordHistory: newUser.correctPassword,
      passwordHistory: [{ password, changedAt: new Date() }],
      isVerified: false,
      // isApproved: false,
      onboardingCompleted: false,
    });

    await newUser.save();

    // ✅ Use branded template
    await sendVerificationEmail(email, code);

    generateTokenAndSetCookie(newUser._id, res);

    res.status(201).json({
      _id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      phone: newUser.phone,
      state: newUser.state,
      city: newUser.city,
      address: newUser.address,
      role: newUser.role,
      msg: 'User registered. Verification code sent to email.',
    });
  } catch (err) {
    console.error('Error in register:', err);
    res.status(500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isPasswordCorrect = await user.correctPassword(password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // if not verified -> send code and token for limited actions
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

    // always update login details
    user.lastLogin = new Date();
    user.loginStatus = 'Active';

    if (
      user.identityDocuments?.status === 'approved' &&
      user.onboardingStage !== 'completed'
    ) {
      user.onboardingStage = 'completed';
      user.onboardingCompleted = true;
    }

    await user.save();

    // ✅ generate token before early returns
    const token = generateTokenAndSetCookie(user._id, res, 'userId');

    // if user not approved yet
    if (!user.isApproved || user.identityDocuments.status !== 'approved') {
      return res.status(200).json({
        msg: 'Login Successful. Awaiting admin approval',
        isVerified: true,
        isApproved: false,
        documentStatus: user.identityDocuments?.status || 'pending',
        token,
        userId: user._id,
      });
    }

    // ✅ approved user
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
      documentStatus: user.identityDocuments?.status,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (err) {
    console.error('Error in login:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// =============================
// LOGOUT
// =============================
// const logoutUser = (req, res) => {
// 	try {
// 		res.cookie("jwt", "", { maxAge: 1 });
// 		res.status(200).json({ message: "User logged out successfully" });
// 	} catch (err) {
// 		console.error("Error in logoutUser:", err.message);
// 		res.status(500).json({ error: err.message });
// 	}
// };
const logoutUser = async (req, res) => {
  try {
    const userId = req.user.id; // assuming you attach user from token middleware
    await User.findByIdAndUpdate(userId, { loginStatus: 'Inactive' });
    res.cookie('jwt', '', { maxAge: 1 });
    res.clearCookie('userId'); // remove token cookie
    res
      .status(200)
      .json({ msg: 'Logged out successfully', loginStatus: 'Inactive' });
  } catch (err) {
    console.error('Error in logout:', err.message);
    res.status(500).json({ error: err.message });
  }
};
// =============================
// VERIFY EMAIL
// =============================
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.isVerified)
      return res.status(400).json({ msg: 'Invalid request' });
    if (user.emailCode !== code || Date.now() > user.emailCodeExpires) {
      return res.status(400).json({ msg: 'Code expired or incorrect' });
    }
    user.isVerified = true;
    user.emailCode = null;
    user.emailCodeExpires = null;
    await user.save();
    res.json({ msg: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const updateUser = async (req, res) => {
  const { phone, state, city, streetAddress, zipCode } = req.body;
  const userId = req.user._id; // from auth middleware

  try {
    // Ensure user exists
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure logged-in user is updating their own profile
    if (req.params.id !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You cannot update another user's profile" });
    }

    // Update fields → default to empty string if not provided

    user.phone = phone !== undefined ? phone : '';
    user.state = state !== undefined ? state : '';
    user.city = city !== undefined ? city : '';
    user.streetAddress = streetAddress !== undefined ? streetAddress : '';
    user.zipCode = zipCode !== undefined ? zipCode : '';

    // Save updated user
    await user.save();

    // Exclude sensitive fields from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.passwordHistory;
    delete userResponse.resetCode;
    delete userResponse.resetCodeExpires;
    delete userResponse.emailCode;
    delete userResponse.emailCodeExpires;

    res.status(200).json({
      message: 'Profile updated successfully',
      user: userResponse,
    });
  } catch (err) {
    console.error('Error in updateUser:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

const verifyPasswordResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    //   if (!user || user.isVerified) return res.status(400).json({ msg: "Invalid request" });

    if (user.resetCode !== code || Date.now() > user.reseCodeExpires)
      return res.status(400).json({ msg: 'Code expired or incorrect' });

    user.isVerified = true;
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({ msg: 'code verified successfully' });
  } catch (err) {
    res.status(500).json({ msg: err.msg });
  }
};

// Resend Verification Code
// RESEND VERIFICATION CODE
// =============================
const resendCode = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.isVerified) {
      return res
        .status(400)
        .json({ msg: 'User not found or already verified' });
    }

    const code = generateCode();
    user.emailCode = code;
    user.emailCodeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // ✅ Branded resend
    await sendVerificationEmail(email, code);

    res.json({ msg: 'New verification code sent' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// const changePassword = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { currentPassword, newPassword, confirmNewPassword } = req.body;

//     if (newPassword !== confirmNewPassword) {
//       return res.status(400).json({ msg: "Passwords do not match" });
//     }

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ msg: "User not found" });

//     // Verify current password
//     if (!(await user.correctPassword(currentPassword))) {
//       return res.status(400).json({ msg: "Incorrect current password" });
//     }

//    // Prevent reuse (check against history)
//            for (let entry of user.passwordHistory) {
//              const reused = await bcrypt.compare(newPassword, entry.password);
//              if (reused) {
//                return res.status(400).json({ msg: "Password reused from history" });
//              }
//            }

//         user.password = newPassword;

//        // Push new password hash to history
//        user.passwordHistory.push({ password: user.password, changedAt: new Date() });
//        if (user.passwordHistory.length > 5) user.passwordHistory.shift();

//        await user.save();
//     res.json({ msg: "Password changed successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };
// Change Password
const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const user = await User.findById(userId).select(
      '+password +passwordHistory'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    const validCurrent = await user.correctPassword(currentPassword);
    if (!validCurrent) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    // Prevent reuse
    for (let entry of user.passwordHistory) {
      const reused = await bcrypt.compare(newPassword, entry.password);
      if (reused) {
        return res
          .status(400)
          .json({ message: 'You cannot reuse an old password' });
      }
    }

    // Just set and save — model handles history + hashing
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// FORGOT PASSWORD
// =============================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ msg: 'Email not found' });

    const code = user.setPasswordResetCode();
    await user.save({ validateBeforeSave: false });

    // ✅ Branded reset email
    await sendPasswordResetEmail(email, code);
    console.log('Email sent successfully');

    res.json({ msg: 'Password reset code sent' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
    console.error('Email sending failed:', err);
  }
};

const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.validateResetCode(code)) {
      return res.status(400).json({ message: 'Invalid/expired OTP' });
    }

    // Generate short-lived JWT (15 mins expiry)
    const token = jwt.sign(
      { userId: user._id, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ success: true, token, message: 'OTP verified' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
// Step 3 – change the password with the JWT

// const resetPassword = async (req, res) => {
//   try {
//     const { token, newPassword, confirmPassword } = req.body;
//     if (!token || !newPassword || !confirmPassword) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     if (newPassword !== confirmPassword) {
//       return res.status(400).json({ message: "Passwords do not match" });
//     }

//     // 🔑 Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     if (decoded.purpose !== "password_reset") {
//       return res.status(400).json({ message: "Invalid token" });
//     }

//     // 🔍 Find user
//     const user = await User.findById(decoded.userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // ⛔ Prevent reusing current password
//     if (await bcrypt.compare(newPassword, user.password)) {
//       return res
//         .status(400)
//         .json({ message: "New password cannot be the same as the old password" });
//     }

//     // ⛔ Prevent reusing passwords from history
//     for (const entry of user.passwordHistory || []) {
//       if (await bcrypt.compare(newPassword, entry.password)) {
//         return res
//           .status(400)
//           .json({ message: "You have already used this password before" });
//       }
//     }

//     // ✅ Save current hashed password into history
//     user.passwordHistory = user.passwordHistory || [];
//     user.passwordHistory.push({
//       password: user.password, // already hashed
//       changedAt: new Date(),
//     });

//     // Keep only the last 5 passwords
//     if (user.passwordHistory.length > 5) {
//       user.passwordHistory.shift();
//     }

//     // ✅ Assign new password (plain) — pre-save hook will hash it
//     user.password = newPassword;

//     // 🔄 Clear reset tokens
//     user.emailCode = undefined;
//     user.emailCodeExpires = undefined;
//     user.resetCode = undefined;
//     user.resetCodeExpires = undefined;

//     await user.save();

//     res.json({ success: true, message: "Password updated successfully ✅" });
//   } catch (err) {
//     if (err.name === "TokenExpiredError") {
//       return res.status(400).json({ message: "Token expired" });
//     }
//     console.error("resetPassword error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };
// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId).select(
      '+password +passwordHistory'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prevent reuse
    for (let entry of user.passwordHistory) {
      const reused = await bcrypt.compare(newPassword, entry.password);
      if (reused) {
        return res
          .status(400)
          .json({ message: 'You cannot reuse an old password' });
      }
    }

    user.password = newPassword;
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadDocuments = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Define required + optional fields
    const requiredFields = ['idCardFront'];
    // const optionalFields = ["cac"];

    let uploadedCount = 0;

    // Save required documents
    requiredFields.forEach(field => {
      if (req.files[field] && req.files[field][0]) {
        user.identityDocuments[field] = req.files[field][0].path; // Cloudinary URL
        uploadedCount++;
      }
    });

    // Save optional documents (if provided)
    // optionalFields.forEach((field) => {
    //   if (req.files[field] && req.files[field][0]) {
    //     user.identityDocuments[field] = req.files[field][0].path; // Cloudinary URL
    //   }
    // });

    // Check if all required docs uploaded
    const missingDocs = requiredFields.filter(
      field => !user.identityDocuments[field]
    );
    if (missingDocs.length > 0) {
      return res.status(400).json({
        error: `Missing required documents: ${missingDocs.join(', ')}`,
      });
    }

    // ✅ Reset if previously rejected
    user.resetDocumentsIfRejected();

    // ✅ Mark as pending for admin review
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const acceptTerms = async (req, res) => {
  try {
    const { userId } = req.params;
    const { acceptedTerms, acceptedPrivacy } = req.body;

    // ✅ Only allow the logged-in user to accept their own terms
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized action' });
    }

    // 🔎 Find user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // ✅ Both must be accepted
    if (!acceptedTerms || !acceptedPrivacy) {
      return res.status(400).json({
        error: 'You must accept both Terms and Privacy Policy',
      });
    }

    // ✅ Check required docs
    const { idCardFront } = user.identityDocuments;

    if (!idCardFront) {
      return res.status(400).json({
        error:
          'You must upload all required document (ID card) before accepting terms.',
      });
    }

    // ✅ Update terms & stage
    user.acceptedTerms = true;
    user.acceptedPrivacy = true;
    user.onboardingStage = 'admin_review';
    await user.save();

    // ✅ Safe response (no password / history / reset codes)
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
  } catch (err) {
    console.error('acceptTerms error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateProfilePhoto = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No profile photo uploaded!' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Save Cloudinary URL to user
    user.profilePic = req.file.path;
    await user.save();

    res.status(200).json({
      message: 'Profile photo updated successfully',
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get the profile of the currently logged-in user.
 * Uses req.user._id from auth middleware.
 */
/**
 * Get the profile of the currently logged-in user.
 * Uses req.user._id from auth middleware.
 */
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    const userResponse = {
      _id: user._id,
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
      streetAddress: user.streetAddress || '',
      zipCode: user.zipCode || '',
      isVerified: user.isVerified || false,
      isApproved: user.isApproved || false,
      identityDocuments: user.identityDocuments || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      message: 'My profile fetched successfully',
      user: userResponse,
    });
  } catch (err) {
    console.error('Error in getMyProfile:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

const getUserById = async (req, res) => {
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
      acceptedTerms: user.acceptedTerms || '',
      acceptedPrivacy: user.acceptedPrivacy || '',
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

export {
  register,
  login,
  logoutUser,
  updateUser,
  getUserProfile,
  getMyProfile,
  verifyEmail,
  resendCode,
  verifyResetCode,
  forgotPassword,
  resetPassword,
  changePassword,
  acceptTerms,
  uploadDocuments,
  updateProfilePhoto,
  getUserById,
  // approveUser
};
