// models/DeviceSession.js
import mongoose from 'mongoose';

const rememberTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, index: true },
  deviceInfo: String,
  ip: String,
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
  lastUsedAt: Date,
});

const deviceSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  tokenHash: { type: String, index: true },
  deviceInfo: String,
  ip: String,
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: Date,
  expiresAt: Date,
  revoked: { type: Boolean, default: false },
  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  }, // admin id
});

export default mongoose.model('DeviceSession', deviceSessionSchema);
