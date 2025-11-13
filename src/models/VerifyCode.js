import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const S = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    channel: { type: String, enum: ['email'] },
    purpose: { type: String, enum: ['signup', 'reset', 'change_email'] },
    code: String,
    expiresAt: Date,
    usedAt: Date,
  },
  { timestamps: true }
);
export default model('VerifyCode', S);
