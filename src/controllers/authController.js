// @ts-nocheck
import User from '../models/userModel.js';
import speakeasy from 'speakeasy';
import bcrypt from 'bcryptjs';
import generateTokenAndSetCookie from '../utils/helpers/generateTokenAndSetCookie.js';
import { v2 as cloudinary } from 'cloudinary';
import generateCode from '../utils/generateCode.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../utils/sendEmails.js';
import jwt from 'jsonwebtoken';


// In-memory session store (use Redis in production)




cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



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

const totpSetup = async ( req, res ) =>
{
  const secret = speakeasy.generateSecret( { length: 20 } );
  res.json( { otpauth_url: secret.otpauth_url, base32: secret.base32 } );
};

const totpEnable = async ( req, res, next ) =>
{
  try
  {
    const { userId, base32, code } = req.body;
    const ok = speakeasy.totp.verify( {
      secret: base32,
      encoding: 'base32',
      token: code,
    } );
    if ( !ok ) return res.status( 400 ).json( { error: 'INVALID_TOTP' } );
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'twoFA.totpEnabled': true,
          'twoFA.totpSecretEncrypted': base32,
        },
      }
    );
    res.json( { ok: true } );
  } catch ( e )
  {
    next( e );
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
  // approveUser
};
