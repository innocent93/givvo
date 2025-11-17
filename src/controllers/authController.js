/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
// @ts-nocheck
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

// In-memory session store (use Redis in production)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FAILED = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

// =============================
// REGISTER
// =============================
const register = async (req, res) => {
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
      location,
      streetAddress,
      zipCode,
      dateOfBirth,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !username ||
      !email ||
      !password ||
      !phone ||
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
      username,
      email,
      password,
      phone,
      state,
      city,
      location,
      streetAddress,
      zipCode,
      dateOfBirth,
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
      username: newUser.username,
      email: newUser.email,
      phone: newUser.phone,
      state: newUser.state,
      city: newUser.city,
      location: newUser.location,
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

    // ⭐ Fix: Initialize missing twoFA for older users
    if (!user.twoFA) {
      user.twoFA = {
        enabled: false,
        emailCode: null,
        emailCodeExpires: null,
      };
      await user.save();
    }

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

    if (user.twoFA?.enabled) {
      // Send a new code for login confirmation
      // const code = crypto.randomInt(100000, 999999).toString();
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

    // always update login details
    user.lastLogin = new Date();
    user.loginStatus = 'Active';

    // if (
    //   user.identityDocuments?.status === 'approved' &&
    //   user.onboardingStage !== 'completed'
    // ) {
    //   user.onboardingStage = 'completed';
    //   user.onboardingCompleted = true;
    // }

    await user.save();

    // ✅ generate token before early returns
    const token = generateTokenAndSetCookie(user._id, res, 'userId');

    // if user not approved yet
    // if (!user.isApproved || user.identityDocuments.status !== 'approved') {
    //   return res.status(200).json({
    //     msg: 'Login Successful. Awaiting admin approval',
    //     isVerified: true,
    //     isApproved: false,
    //     documentStatus: user.identityDocuments?.status || 'pending',
    //     token,
    //     userId: user._id,
    //   });
    // }

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
      twoFA: user.twoFA?.enabled,
      documentStatus: user.identityDocuments?.status,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// export const login = async (req, res) => {
//   try {
//     const { email, password, recaptchaToken, remember } = req.body;
//     const ip = req.ip;

//     // verify recaptcha first
//     const recaptchaOk = await verifyRecaptcha(recaptchaToken, ip);
//     if (!recaptchaOk) return res.status(400).json({ error: 'reCAPTCHA failed' });

//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

//     // Ensure twoFA exists on the doc
//     if (!user.twoFA || typeof user.twoFA !== 'object') {
//       user.twoFA = {
//         enabled: false,
//         method: 'email',
//         emailCode: null,
//         emailCodeExpires: null,
//         totpSecret: null,
//         totpEnabled: false,
//         backupCodes: []
//       };
//       await user.save();
//     }

//     // check lock
//     if (user.lockUntil && user.lockUntil > Date.now()) {
//       return res.status(423).json({ error: 'Account locked. Try again later.' });
//     }

//     const isPasswordCorrect = await user.correctPassword(password);
//     if (!isPasswordCorrect) {
//       // increment failed counter
//       user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
//       if (user.failedLoginAttempts >= MAX_FAILED) {
//         user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
//       }
//       await user.save();
//       return res.status(400).json({ error: 'Invalid password' });
//     }

//     // password ok -> reset failed counters
//     user.failedLoginAttempts = 0;
//     user.lockUntil = null;

//     // not verified email
//     if (!user.isVerified) {
//       const code = generateCode();
//       user.emailCode = code;
//       user.emailCodeExpires = Date.now() + 10 * 60 * 1000;
//       await user.save();
//       await sendVerificationEmail(user.email, code);
//       const token = generateTokenAndSetCookie(user._id, res, 'userId'); // limited actions token
//       return res.status(200).json({
//         msg: 'Account not verified. A new verification code has been sent.',
//         isVerified: false,
//         token,
//         userId: user._id
//       });
//     }

//     // if totp-based 2FA enabled -> prompt for TOTP; do not create session yet
//     if (user.twoFA?.totpEnabled) {
//       // return instruction to client to display TOTP input
//       return res.status(200).json({ require2FA: true, method: 'totp', userId: user._id });
//     }

//     // if email 2FA enabled -> create email code, send and prompt
//     if (user.twoFA?.enabled && (!user.twoFA.totpEnabled)) {
//       const code = generateCode();
//       user.twoFA.emailCode = code;
//       user.twoFA.emailCodeExpires = Date.now() + 10 * 60 * 1000;
//       await user.save();
//       await sendTwoFactorVerificationEmail(user.email, code);
//       return res.status(200).json({ require2FA: true, method: 'email', userId: user._id });
//     }

//     // No 2FA -> log in normally
//     user.lastLogin = new Date();
//     user.loginStatus = 'Active';
//     await user.save();

//     const token = generateTokenAndSetCookie(user._id, res, 'userId');

//     // create remember-me token if user asked
//     if (remember) {
//       await createRememberMe(user, { res, deviceInfo: req.get('User-Agent'), ip, days: Number(process.env.REMEMBER_ME_DAYS || 30) });
//     }

//     return res.status(200).json({
//       token,
//       _id: user._id,
//       email: user.email,
//       msg: 'Login Successful',
//       isVerified: true,
//       role: user.role
//     });
//   } catch (err) {
//     console.error('Login error', err);
//     res.status(500).json({ error: err.message });
//   }
// };

/**
 * Validate remember-me cookie flow (middleware-like)
 * Call this at request start if no session found:
 * - reads cookie 'remember_me', validates, issues jwt via generateTokenAndSetCookie
 */
// export const resumeSessionFromRememberMe = async (req, res) => {
//   try {
//     const raw = req.cookies?.remember_me;
//     if (!raw) return null;
//     const { user, tokenHash } = await validateRememberMe(raw);
//     if (!user) return null;
//     // rotate token: remove old, issue a new one
//     await revokeAndRotateRememberToken(user, raw, { res, ip: req.ip, deviceInfo: req.get('User-Agent') });
//     // create JWT
//     const token = generateTokenAndSetCookie(user._id, res, 'userId');
//     return token;
//   } catch (err) {
//     console.error('resumeSessionFromRememberMe error', err);
//     return null;
//   }
// };

// Helper used above (rotate and revoke)
// async function revokeAndRotateRememberToken(user, rawToken, { res, ip, deviceInfo }) {
//   const { tokenHash } = await validateRememberMe(rawToken);
//   // remove existing token
//   user.rememberMeTokens = (user.rememberMeTokens || []).filter(t => t.tokenHash !== tokenHash);
//   await user.save();
//   // create new one
//   await createRememberMe(user, { res, deviceInfo, ip, days: Number(process.env.REMEMBER_ME_DAYS || 30) });
// }

const verifyLogin2FA = async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;

    //  // ✅ Only allow the logged-in user to verify 2Fa
    // if (req.user._id.toString() !== userId) {
    //   return res.status(403).json({ error: 'Unauthorized action' });
    // }
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

    const token = generateTokenAndSetCookie(user._id, res, userId);
    res.json({ token, user });
  } catch (error) {
    console.error('Error in Verifying login 2fa :', error);
    res.status(500).json({ error: error.message });
  }
};

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
    // eslint-disable-next-line prefer-const
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

const totpSetup = async (req, res) => {
  const secret = speakeasy.generateSecret({ length: 20 });
  res.json({ otpauth_url: secret.otpauth_url, base32: secret.base32 });
};

const totpEnable = async (req, res, next) => {
  try {
    const { userId, base32, code } = req.body;
    const ok = speakeasy.totp.verify({
      secret: base32,
      encoding: 'base32',
      token: code,
    });
    if (!ok) return res.status(400).json({ error: 'INVALID_TOTP' });
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'twoFA.totpEnabled': true,
          'twoFA.totpSecretEncrypted': base32,
        },
      }
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export {
  register,
  login,
  logoutUser,
  verifyEmail,
  resendCode,
  verifyResetCode,
  verifyPasswordResetCode,
  forgotPassword,
  resetPassword,
  changePassword,
  acceptTerms,
  uploadDocuments,
  totpSetup,
  totpEnable,
  verifyLogin2FA,
  // approveUser
};
