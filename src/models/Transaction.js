import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'trade_payment', 'refund'],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: 'USD',
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },

    paymentIntentId: String,
    stripeChargeId: String,
    bankAccountId: String,

    description: String,

    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
