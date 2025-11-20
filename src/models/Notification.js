import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    type: {
      type: String,
      enum: ['trade', 'escrow', 'dispute', 'kyc', 'system', 'message'],
      required: true,
    },

    title: String,
    message: String,

    relatedTo: {
      model: String,
      id: mongoose.Schema.Types.ObjectId,
    },

    read: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
