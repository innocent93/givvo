// @ts-nocheck
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const passwordHistorySchema = new mongoose.Schema({
  password: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
});

const adminSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, minLength: 6, required: true },
    phone: { type: String, minLength: 6, required: true },

    // Location details
    // country: { type: String, required: true },
    state: { type: String },
    city: { type: String },
    location: { type: String, required: true },
    streetAddress: { type: String, required: true },
    zipCode: { type: String },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    googleId: { type: String, index: true, sparse: true },
    facebookId: { type: String, index: true, sparse: true },

    // Optional profile info
    profilePic: {
      type: String,
      default:
        'https://res.cloudinary.com/dq5puvtne/image/upload/v1740648447/next_crib_avatar_jled2z.jpg',
    },
    dateOfBirth: { type: Date },
    role: {
      type: String,
      enum: ['admin', 'superadmin', 'moderator', 'support'],
      default: 'superadmin',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    twoFA: {
      enabled: { type: Boolean, default: false },
      emailCode: { type: String, default: null },
      emailCodeExpires: { type: Date, default: null },
    },
    emailCode: String,
    emailCodeExpires: Date,
    resetCode: String,
    resetCodeExpires: Date,
    verificationToken: String,
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
    passwordHistory: [passwordHistorySchema],
  },
  { timestamps: true }
);

// Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
adminSchema.methods.correctPassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

adminSchema.methods.setPasswordResetCode = function () {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  this.resetCode = crypto.createHash('sha256').update(code).digest('hex');
  this.resetCodeExpires = Date.now() + 10 * 60 * 1000; // 10minute
  return code; // we will email this
};

adminSchema.methods.validateResetCode = function (code) {
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  return (
    hash === this.resetCode &&
    this.resetCodeExpires &&
    this.resetCodeExpires > Date.now()
  );
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
