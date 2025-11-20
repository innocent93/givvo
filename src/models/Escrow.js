import mongoose from 'mongoose';

const escrowSchema = new mongoose.Schema(
  {
    trade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trade',
      required: true,
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Amount
    amount: {
      type: Number,
      required: true,
    },

    currency: String,

    // Status
    status: {
      type: String,
      enum: ['locked', 'released', 'refunded', 'disputed'],
      default: 'locked',
    },

    // Release
    releaseType: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'manual',
    },

    autoReleaseTime: Date,

    // Dispute
    dispute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispute',
    },

    // Confirmations
    buyerConfirmed: { type: Boolean, default: false },
    sellerConfirmed: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
    releasedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Escrow', escrowSchema);
