import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const UserSchema = new Schema(
  {
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    passwordHash: String,
    username: { type: String, unique: true },
    bio: String,
    photoUrl: String,
    roles: { type: [String], default: ['user'] },
    emailVerified: { type: Boolean, default: false },
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
  },
  { timestamps: true }
);
export default model('User', UserSchema);
