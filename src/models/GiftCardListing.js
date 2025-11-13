import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const GiftCardListingSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    type: String,
    nominalValue: Number,
    currency: String,
    price: Number,
    settlementCurrency: String,
    imageUrls: [String],
    status: {
      type: String,
      enum: ['active', 'sold', 'cancelled', 'under_verification'],
      default: 'active',
    },
  },
  { timestamps: true }
);
export default model('GiftCardListing', GiftCardListingSchema);
