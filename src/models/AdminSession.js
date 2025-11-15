// models/AdminSession.js
import mongoose from 'mongoose';

const adminSessionSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Optional: auto-remove expired sessions
adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AdminSession = mongoose.model('AdminSession', adminSessionSchema);

export default AdminSession;
