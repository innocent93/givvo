// @ts-nocheck
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const passwordHistorySchema = new mongoose.Schema({
  password: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
});

const identityDocumentsSchema = new mongoose.Schema(
  {
    idCardFront: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'verified', 'unverified'],
      default: 'pending',
    },
    rejectionReason: String,
    uploadedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minLength: 6 },
    phone: { type: String, required: true, minLength: 6 },
    state: { type: String, required: true },
    city: { type: String, required: true },
    streetAddress: { type: String, required: true },
    zipCode: String,
    dateOfBirth: Date,
    profilePic: {
      type: String,
      default:
        'https://res.cloudinary.com/dq5puvtne/image/upload/v1740648447/next_crib_avatar_jled2z.jpg',
    },

    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    googleId: { type: String, index: true, sparse: true },
    facebookId: { type: String, index: true, sparse: true },

    acceptedTerms: { type: Boolean, default: false },
    acceptedPrivacy: { type: Boolean, default: false },

    onboardingCompleted: { type: Boolean, default: false },
    onboardingStage: {
      type: String,
      enum: ['documents', 'terms', 'admin_review', 'completed'],
      default: 'documents',
    },

    identityDocuments: { type: identityDocumentsSchema, default: {} },

    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    requiresDocument: { type: Boolean, default: false },

    role: {
      type: String,
      enum: ['user', 'buyer', 'seller'],
      default: 'user',
    },
    loginStatus: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Inactive',
    },
    lastLogin: Date,

    emailCode: String,
    emailCodeExpires: Date,
    resetCode: String,
    resetCodeExpires: Date,

    passwordHistory: [passwordHistorySchema],
  },
  { timestamps: true }
);

// 🔒 Password Hash
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const hashed = await bcrypt.hash(this.password, 12);
  this.password = hashed;

  this.passwordHistory.push({ password: this.password });
  if (this.passwordHistory.length > 5) {
    this.passwordHistory = this.passwordHistory.slice(-5);
  }

  next();
});

// Compare Password
userSchema.methods.correctPassword = async function (candidatePwd) {
  return bcrypt.compare(candidatePwd, this.password);
};

// Reset Code
userSchema.methods.setPasswordResetCode = function () {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  this.resetCode = crypto.createHash('sha256').update(code).digest('hex');
  this.resetCodeExpires = Date.now() + 10 * 60 * 1000;
  return code;
};

userSchema.methods.validateResetCode = function (code) {
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  return (
    this.resetCode === hash &&
    this.resetCodeExpires &&
    this.resetCodeExpires > Date.now()
  );
};

const User = mongoose.model('User', userSchema);
export default User;
