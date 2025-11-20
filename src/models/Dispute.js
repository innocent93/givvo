import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema(
  {
    trade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trade',
      required: true,
    },

    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    respondent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Dispute Details
    reason: {
      type: String,
      enum: ['non_payment', 'invalid_code', 'wrong_amount', 'scam', 'other'],
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    evidence: [
      {
        type: String,
        uploadedAt: Date,
      },
    ],

    // Status
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'closed'],
      default: 'open',
    },

    // Resolution
    resolution: {
      type: String,
      enum: ['refund_buyer', 'release_to_seller', 'split'],
      default: null,
    },

    resolutionNotes: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    createdAt: { type: Date, default: Date.now },
    resolvedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Dispute', disputeSchema);
