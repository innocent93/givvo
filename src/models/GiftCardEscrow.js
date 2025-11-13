import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const GiftCardEscrowSchema = new Schema(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'GiftCardListing',
      index: true,
    },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    currency: String,
    state: {
      type: String,
      enum: ['locked', 'released', 'refunded', 'disputed'],
      default: 'locked',
    },
  },
  { timestamps: true }
);
export default model('GiftCardEscrow', GiftCardEscrowSchema);
