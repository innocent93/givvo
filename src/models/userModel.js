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
      trim: true,
    },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minLength: 6 },
    phone: { type: String, required: true, minLength: 6 },
    state: { type: String},
    city: { type: String },
    location: { type: String },
    streetAddress: { type: String},
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
    // Add to your userSchema
    twoFA: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ['email', 'totp'], default: 'email' }, // new: prefered method
      // email-based
      emailCode: { type: String, default: null },
      emailCodeExpires: { type: Date, default: null },
      // totp-based
      totpSecret: { type: String, default: null }, // base32 secret (store encrypted ideally)
      totpEnabled: { type: Boolean, default: false },
      // backup codes (store hashed)
      backupCodes: [
        {
          codeHash: String,
          used: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
    // Remember-me tokens (multiple devices)
    rememberMeTokens: [
      {
        tokenHash: String, // sha256(token)
        deviceInfo: String, // optional user agent / device name
        ip: String,
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],

    // Failed login tracking for account lockout
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

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
    status: {
      type: String,
      enum: ['active', 'banned', 'suspended', 'frozen'],
      default: 'active',
    },
    lastLogin: Date,

    emailCode: String,
    emailCodeExpires: Date,
    resetCode: String,
    resetCodeExpires: Date,

    bitgoUserId: String,

    suspensionExpiry: {
      type: Date,
      default: null,
    },

    frozenUntil: {
      type: Date,
      default: null,
    },

    bannedAt: {
      type: Date,
      default: null,
    },

    passwordHistory: [passwordHistorySchema],
  },
  { timestamps: true }
);

// 🔒 Password Hash
// 🔒 Password Hashing + Password History
userSchema.pre("save", async function (next) {
  // Only run when password is modified
  if (!this.isModified("password")) return next();

  // Hash new password
  const hashedPassword = await bcrypt.hash(this.password, 12);
  this.password = hashedPassword;

  // Store hashed password into passwordHistory
  this.passwordHistory.push({
    password: hashedPassword,
    changedAt: new Date(),
  });

  // Keep last 5 passwords only
  if (this.passwordHistory.length > 5) {
    this.passwordHistory = this.passwordHistory.slice(-5);
  }

  next();
});

// 🔒 Ensure password hashing also works for findOneAndUpdate
userSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  if (!update.password) return next();

  // Hash new password
  const hashedPassword = await bcrypt.hash(update.password, 12);
  update.password = hashedPassword;

  // Push to passwordHistory
  update.$push = update.$push || {};
  update.$push.passwordHistory = {
    password: hashedPassword,
    changedAt: new Date(),
  };

  // Handle history limit (5 passwords max)
  const user = await this.model.findOne(this.getQuery());
  if (user.passwordHistory.length >= 5) {
    update.$push.passwordHistory.$each = [];
    update.$push.passwordHistory.$slice = -5;
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
