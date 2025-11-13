// @ts-nocheck
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const passwordHistorySchema = new mongoose.Schema({
  password: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
});

const identityDocumentsSchema = new mongoose.Schema(
  {
    idCardFront: { type: String },
    // photo: { type: String },
    // tin: { type: String },
    // bankStatement: { type: String },
    // cac: { type: String }, // optional
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'verified', 'unverified'],
      default: 'pending',
    },
    rejectionReason: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: { type: String, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, minLength: 6, required: true },
    phone: { type: String, minLength: 6, required: true },

    // Location
    state: { type: String, required: true },
    city: { type: String, required: true },
    streetAddress: { type: String, required: true },
    zipCode: { type: String },

    // Optional profile info
    dateOfBirth: { type: Date },
    profilePic: {
      type: String,
      default:
        'https://res.cloudinary.com/dq5puvtne/image/upload/v1740648447/next_crib_avatar_jled2z.jpg',
    },
    // OAuth fields (NEW)
    googleId: { type: String, index: true, sparse: true },
    facebookId: { type: String, index: true, sparse: true },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },

    // ✅ Policy acceptance
    acceptedTerms: { type: Boolean, required: true, default: false },
    acceptedPrivacy: { type: Boolean, required: true, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    onboardingStage: {
      type: String,
      enum: ['documents', 'terms', 'admin_review', 'completed'],
      default: 'documents',
    },

    // Identity Verification
    identityDocuments: { type: identityDocumentsSchema, default: {} },

    // Verification & approval
    isVerified: { type: Boolean, default: false }, // email verified
    isApproved: { type: Boolean, default: false }, // admin approval
    requiresDocument: { type: Boolean, default: false },

    // Role
    role: {
      type: String,
      enum: ['user', 'buyer', 'seller'],
      default: 'user',
    },

    // Status & activity
    loginStatus: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Inactive',
    },
    lastLogin: { type: Date },

    // Auth utilities
    emailCode: String,
    emailCodeExpires: Date,
    resetCode: String,
    resetCodeExpires: Date,
    verificationToken: String,
    kyc: {
      status: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'rejected'],
        default: 'unverified',
      },
      documents: {
        idFrontUrl: String,
        idBackUrl: String,
        selfieUrl: String,
        utilityBillUrl: String,
      },
      providerRef: String,
      rejectionReason: String,
    },
    banks: [
      {
        bankCode: String,
        accountNumber: String,
        accountName: String,
        recipientCode: String,
        verified: Boolean,
      },
    ],

    passwordHistory: [passwordHistorySchema],

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 🔒 Hash password before save
// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Hash new password
  const hashed = await bcrypt.hash(this.password, 12);
  this.password = hashed;

  // Add to password history
  this.passwordHistory.push({ password: this.password });

  // Keep only last 5
  if (this.passwordHistory.length > 5) {
    this.passwordHistory = this.passwordHistory.slice(-5);
  }

  next();
});

// Compare passwords
userSchema.methods.correctPassword = async function (candPwd) {
  return bcrypt.compare(candPwd, this.password);
};

// Generate reset code
userSchema.methods.setPasswordResetCode = function () {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  this.resetCode = crypto.createHash('sha256').update(code).digest('hex');
  this.resetCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return code;
};

// Validate reset code
userSchema.methods.validateResetCode = function (code) {
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  return (
    hash === this.resetCode &&
    this.resetCodeExpires &&
    this.resetCodeExpires > Date.now()
  );
};

// Reset identity docs if rejected
userSchema.methods.resetDocumentsIfRejected = function () {
  if (this.identityDocuments.status === 'rejected') {
    this.identityDocuments.status = 'pending';
    this.identityDocuments.rejectionReason = undefined;
    this.identityDocuments.reviewedAt = undefined;
    this.onboardingStage = 'admin_review';
  }
};

const User = mongoose.model('User', userSchema);
export default User;
