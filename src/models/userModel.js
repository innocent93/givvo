// // @ts-nocheck
// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';
// import crypto from 'crypto';

// const passwordHistorySchema = new mongoose.Schema({
//   password: { type: String, required: true },
//   changedAt: { type: Date, default: Date.now },
// });

// const identityDocumentsSchema = new mongoose.Schema(
//   {
//     idCardFront: String,
//     status: {
//       type: String,
//       enum: ['pending', 'approved', 'rejected', 'verified', 'unverified'],
//       default: 'pending',
//     },
//     rejectionReason: String,
//     uploadedAt: { type: Date, default: Date.now },
//     reviewedAt: Date,
//   },
//   { _id: false }
// );

// const userSchema = new mongoose.Schema(
//   {
//     firstName: { type: String, required: true },
//     lastName: { type: String, required: true },
//     username: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//     },
//     password: { type: String, required: true, minLength: 6 },
//     phone: { type: String, required: true, minLength: 6, sparse: true },
//     state: { type: String },
//     city: { type: String },
//     location: { type: String },
//     streetAddress: { type: String },
//     zipCode: String,
//     dateOfBirth: Date,
//     profilePic: {
//       type: String,
//       default:
//         'https://res.cloudinary.com/dq5puvtne/image/upload/v1740648447/next_crib_avatar_jled2z.jpg',
//     },

//     provider: {
//       type: String,
//       enum: ['local', 'google', 'facebook'],
//       default: 'local',
//     },
//     googleId: { type: String, index: true, sparse: true },
//     facebookId: { type: String, index: true, sparse: true },

//     acceptedTerms: { type: Boolean, default: false },
//     acceptedPrivacy: { type: Boolean, default: false },

//     onboardingCompleted: { type: Boolean, default: false },
//     onboardingStage: {
//       type: String,
//       enum: ['documents', 'terms', 'admin_review', 'completed'],
//       default: 'documents',
//     },

//     identityDocuments: { type: identityDocumentsSchema, default: {} },

//     isVerified: { type: Boolean, default: false },
//     isApproved: { type: Boolean, default: false },
//     requiresDocument: { type: Boolean, default: false },
//     // Add to your userSchema
//     twoFA: {
//       enabled: { type: Boolean, default: false },
//       method: { type: String, enum: ['email', 'totp'], default: 'email' }, // new: prefered method
//       // email-based
//       emailCode: { type: String, default: null },
//       emailCodeExpires: { type: Date, default: null },
//       // totp-based
//       totpSecret: { type: String, default: null }, // base32 secret (store encrypted ideally)
//       totpEnabled: { type: Boolean, default: false },
//       // backup codes (store hashed)
//       backupCodes: [
//         {
//           codeHash: String,
//           used: { type: Boolean, default: false },
//           createdAt: { type: Date, default: Date.now },
//         },
//       ],
//     },
//     // Remember-me tokens (multiple devices)
//     rememberMeTokens: [
//       {
//         tokenHash: String, // sha256(token)
//         deviceInfo: String, // optional user agent / device name
//         ip: String,
//         createdAt: { type: Date, default: Date.now },
//         expiresAt: Date,
//       },
//     ],

//     // Failed login tracking for account lockout
//     failedLoginAttempts: { type: Number, default: 0 },
//     lockUntil: { type: Date, default: null },

//     role: {
//       type: String,
//       enum: ['user', 'buyer', 'seller', 'merchant', 'personal', 'business'],
//       default: 'user',
//     },
//     loginStatus: {
//       type: String,
//       enum: ['Active', 'Inactive'],
//       default: 'Inactive',
//     },
//     status: {
//       type: String,
//       enum: ['active', 'banned', 'suspended', 'frozen'],
//       default: 'active',
//     },
//     lastLogin: Date,

//     emailCode: String,
//     emailCodeExpires: Date,
//     resetCode: String,
//     resetCodeExpires: Date,

//     bitgoUserId: String,

//     suspensionExpiry: {
//       type: Date,
//       default: null,
//     },

//     frozenUntil: {
//       type: Date,
//       default: null,
//     },

//     bannedAt: {
//       type: Date,
//       default: null,
//     },
//     kyc: {
//       status: {
//         type: String,
//         enum: ['pending', 'verified', 'rejected'],
//         default: 'pending',
//       },
//       idType: String,
//       idNumber: String,
//       idDocument: String,
//       selfie: String,
//       utilityBill: String,
//       documents: {
//         idFrontUrl: String,
//         idBackUrl: String,
//         selfieUrl: String,
//         utilityBillUrl: String,
//       },
//       submittedAt: Date,
//       verifiedAt: Date,
//       rejectionReason: String,
//     },
//     // KYC Leveling
//     kycLevel: {
//       type: Number,
//       enum: [0, 1, 2, 3], // 0 = none, 1 = email, 2 = ID, 3 = address
//       default: 0,
//     },

//     kycSteps: {
//       emailVerified: { type: Boolean, default: false }, // Level 1
//       identityVerified: { type: Boolean, default: false }, // Level 2 (BVN/NIN/face)
//       addressVerified: { type: Boolean, default: false }, // Level 3 (proof of address)
//     },

//     // KYC
//     // kyc: {
//     //   status: {
//     //     type: String,
//     //     enum: ['pending', 'verified', 'rejected'],
//     //     default: 'pending',
//     //   },
//     //   idType: String,
//     //   idNumber: String,
//     //   idDocument: String,
//     //   selfie: String,
//     //   utilityBill: String,
//     //   submittedAt: Date,
//     //   verifiedAt: Date,
//     //   rejectionReason: String,
//     // },

//     // Account Settings
//     linkedBanks: [
//       {
//         bankName: String,
//         accountNumber: String,
//         accountHolder: String,
//         routingNumber: String,
//         verified: Boolean,
//       },
//     ],

//     merchantApplication: {
//       status: {
//         type: String,
//         enum: ['none', 'pending', 'approved', 'rejected'],
//         default: 'none',
//       },
//       businessName: String,
//       businessType: String,
//       registrationNumber: String, // CAC / RC number
//       cacDocument: String, // URL to CAC document
//       proofOfAddress: String, // URL to utility bill / address proof
//       businessVerificationDoc: String, // other business license / doc
//       submittedAt: Date,
//       verifiedAt: Date,
//       rejectionReason: String,
//     },

//     // Trading Stats
//     tradingStats: {
//       totalTrades: { type: Number, default: 0 },
//       completedTrades: { type: Number, default: 0 },
//       cancelledTrades: { type: Number, default: 0 },
//       totalVolume: { type: Number, default: 0 },
//       averageRating: { type: Number, default: 5 },
//       totalReviews: { type: Number, default: 0 },
//     },

//     passwordHistory: [passwordHistorySchema],
//     passwordChangedAt: {
//       type: Date,
//       default: null,
//     },
//   },
//   { timestamps: true }
// );

// // 🔒 Password Hash
// // 🔒 Password Hashing + Password History
// // userSchema.pre('save', async function (next) {
// //   // Only run when password is modified
// //   if (!this.isModified('password')) return next();

// //   // Hash new password
// //   const hashedPassword = await bcrypt.hash(this.password, 12);
// //   this.password = hashedPassword;

// //   // Store hashed password into passwordHistory
// //   this.passwordHistory.push({
// //     password: hashedPassword,
// //     changedAt: new Date(),
// //   });

// //   // Keep last 5 passwords only
// //   if (this.passwordHistory.length > 5) {
// //     this.passwordHistory = this.passwordHistory.slice(-5);
// //   }

// //   next();
// // });
// userSchema.pre('save', async function (next) {
//   // Only run if password is modified
//   if (!this.isModified('password')) return next();

//   // Hash new password
//   const hashedPassword = await bcrypt.hash(this.password, 12);
//   this.password = hashedPassword;

//   // Append to passwordHistory
//   this.passwordHistory = this.passwordHistory || [];
//   this.passwordHistory.push({
//     password: hashedPassword,
//     changedAt: new Date(),
//   });

//   // Keep only last 5 passwords
//   if (this.passwordHistory.length > 5) {
//     this.passwordHistory = this.passwordHistory.slice(-5);
//   }

//   // Set passwordChangedAt (skip for brand-new users to avoid token/iAT issues)
//   if (!this.isNew) {
//     this.passwordChangedAt = new Date();
//   }

//   next();
// });

// // 🔒 Ensure password hashing also works for findOneAndUpdate
// userSchema.pre('findOneAndUpdate', async function (next) {
//   const update = this.getUpdate();

//   if (!update.password) return next();

//   // Hash new password
//   const hashedPassword = await bcrypt.hash(update.password, 12);
//   update.password = hashedPassword;

//   // Push to passwordHistory
//   update.$push = update.$push || {};
//   update.$push.passwordHistory = {
//     password: hashedPassword,
//     changedAt: new Date(),
//   };

//   // Handle history limit (5 passwords max)
//   const user = await this.model.findOne(this.getQuery());
//   if (user.passwordHistory.length >= 5) {
//     update.$push.passwordHistory.$each = [];
//     update.$push.passwordHistory.$slice = -5;
//   }

//   next();
// });

// userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
//   if (this.passwordChangedAt) {
//     // Convert Date to seconds timestamp
//     const changedTimestamp = parseInt(
//       this.passwordChangedAt.getTime() / 1000,
//       10
//     );
//     // If password changed after token was issued, return true
//     return changedTimestamp > JWTTimestamp;
//   }

//   // Password never changed after token
//   return false;
// };

// // Compare Password
// userSchema.methods.correctPassword = async function (candidatePwd) {
//   return bcrypt.compare(candidatePwd, this.password);
// };

// // Reset Code
// userSchema.methods.setPasswordResetCode = function () {
//   const code = Math.floor(1000 + Math.random() * 9000).toString();
//   this.resetCode = crypto.createHash('sha256').update(code).digest('hex');
//   this.resetCodeExpires = Date.now() + 10 * 60 * 1000;
//   return code;
// };

// userSchema.methods.validateResetCode = function (code) {
//   const hash = crypto.createHash('sha256').update(code).digest('hex');
//   return (
//     this.resetCode === hash &&
//     this.resetCodeExpires &&
//     this.resetCodeExpires > Date.now()
//   );
// };

// const User = mongoose.model('User', userSchema);
// export default User;


// user.model.js
// @ts-nocheck
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const passwordHistorySchema = new mongoose.Schema({
  password: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
});

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
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minLength: 6 },
    phone: { type: String, required: true, minLength: 6, sparse: true },
    state: { type: String },
    city: { type: String },
    location: { type: String },
    streetAddress: { type: String },
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

    // === SINGLE KYC BLOCK (single source of truth) ===
    kyc: {
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
      },
      idType: { type: String, default: null },
      idNumber: { type: String, default: null },
      documents: {
        type: new mongoose.Schema(
          {
            idFrontUrl: { type: String, default: null },
            idBackUrl: { type: String, default: null },
            selfieUrl: { type: String, default: null },
            utilityBillUrl: { type: String, default: null },
          },
          { _id: false }
        ),
        default: {},
      },
      submittedAt: { type: Date, default: null },
      verifiedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: null },
    },

    // KYC Leveling
    kycLevel: {
      type: Number,
      enum: [0, 1, 2, 3], // 0 = none, 1 = email, 2 = ID, 3 = address
      default: 0,
    },

    kycSteps: {
      emailVerified: { type: Boolean, default: false }, // Level 1
      identityVerified: { type: Boolean, default: false }, // Level 2 (ID/selfie)
      addressVerified: { type: Boolean, default: false }, // Level 3 (proof of address)
    },

    // misc flags
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },

    // Two factor & tokens
    twoFA: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ['email', 'totp'], default: 'email' },
      emailCode: { type: String, default: null },
      emailCodeExpires: { type: Date, default: null },
      totpSecret: { type: String, default: null },
      totpEnabled: { type: Boolean, default: false },
      backupCodes: [
        {
          codeHash: String,
          used: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },

    rememberMeTokens: [
      {
        tokenHash: String,
        deviceInfo: String,
        ip: String,
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    role: {
      type: String,
      enum: ['user', 'buyer', 'seller', 'merchant', 'personal', 'business'],
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

    suspensionExpiry: { type: Date, default: null },
    frozenUntil: { type: Date, default: null },
    bannedAt: { type: Date, default: null },

    merchantApplication: {
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
      },
      businessName: String,
      businessType: String,
      registrationNumber: String,
      cacDocument: String,
      proofOfAddress: String,
      businessVerificationDoc: String,
      submittedAt: Date,
      verifiedAt: Date,
      rejectionReason: String,
    },

    tradingStats: {
      totalTrades: { type: Number, default: 0 },
      completedTrades: { type: Number, default: 0 },
      cancelledTrades: { type: Number, default: 0 },
      totalVolume: { type: Number, default: 0 },
      averageRating: { type: Number, default: 5 },
      totalReviews: { type: Number, default: 0 },
    },

    passwordHistory: [passwordHistorySchema],
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Password hashing pre-save & pre-findOneAndUpdate (kept your logic)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const hashedPassword = await bcrypt.hash(this.password, 12);
  this.password = hashedPassword;

  this.passwordHistory = this.passwordHistory || [];
  this.passwordHistory.push({
    password: hashedPassword,
    changedAt: new Date(),
  });

  if (this.passwordHistory.length > 5) {
    this.passwordHistory = this.passwordHistory.slice(-5);
  }

  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }

  next();
});

userSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (!update || !update.password) return next();

  const hashedPassword = await bcrypt.hash(update.password, 12);
  update.password = hashedPassword;

  update.$push = update.$push || {};
  update.$push.passwordHistory = {
    password: hashedPassword,
    changedAt: new Date(),
  };

  const user = await this.model.findOne(this.getQuery());
  if (user?.passwordHistory?.length >= 5) {
    // this will keep last 5 on next update
    update.$push.passwordHistory.$slice = -5;
  }

  next();
});

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return changedTimestamp > JWTTimestamp;
  }
  return false;
};

userSchema.methods.correctPassword = async function (candidatePwd) {
  return bcrypt.compare(candidatePwd, this.password);
};

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
