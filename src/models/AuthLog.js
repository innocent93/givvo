// models/AuthLog.js
import mongoose from 'mongoose';

const authLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true,
    },
    email: { type: String, index: true, sparse: true },
    ip: String,
    userAgent: String,
    event: {
      type: String,
      enum: [
        'login_success',
        'login_failure',
        '2fa_sent',
        '2fa_success',
        '2fa_failure',
        '2fa_backup_used',
        'enable_2fa',
        'disable_2fa',
        'remember_me_created',
        'remember_me_revoked',
        'logout',
        'password_change',
        'account_locked',
        'account_unlocked',
      ],
      required: true,
    },
    details: mongoose.Schema.Types.Mixed, // extra context (reason, code used, deviceInfo)
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export default mongoose.model('AuthLog', authLogSchema);
