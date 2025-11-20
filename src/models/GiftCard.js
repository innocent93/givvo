import mongoose from 'mongoose';

const giftCardSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Card Details
    cardType: {
      type: String,
      enum: [
        'Amazon',
        'iTunes',
        'Google Play',
        'Steam',
        'PlayStation',
        'Xbox',
        'Netflix',
        'Spotify',
        'Other',
      ],
      required: true,
    },

    denomination: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: 'USD',
    },

    // Pricing
    price: {
      type: Number,
      required: true,
    },

    discount: {
      type: Number,
      default: 0,
    },

    // Card Code
    cardCode: {
      type: String,
      required: true,
      select: false, // Don't return by default
    },

    cardImage: String,

    // Status
    status: {
      type: String,
      enum: ['available', 'sold', 'disputed', 'cancelled'],
      default: 'available',
    },

    // Verification
    verified: {
      type: Boolean,
      default: false,
    },

    verificationMethod: String,

    // Trade Info
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    trade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trade',
    },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    soldAt: Date,
    expiresAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('GiftCard', giftCardSchema);
