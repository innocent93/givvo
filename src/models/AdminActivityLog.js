// models/AdminActivityLog.js
import mongoose from 'mongoose';

const adminActivityLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    action: {
      type: String,
      enum: ['LOGIN', 'LOGOUT', 'UPDATE', 'DELETE', 'CREATE', 'OTHER'],
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt
  }
);

// Optional: index for faster queries by adminId and action
adminActivityLogSchema.index({ adminId: 1, action: 1 });

const AdminActivityLog = mongoose.model(
  'AdminActivityLog',
  adminActivityLogSchema
);

export default AdminActivityLog;
