import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const TradeSchema = new Schema(
  {
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer' },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
    side: String,
    fiatCurrency: String,
    amountFiat: Number,
    amountBTC: Number,
    price: Number,
    state: {
      type: String,
      enum: [
        'initiated',
        'escrow_locked',
        'paid',
        'released',
        'disputed',
        'cancelled',
      ],
      index: true,
    },
    countdownSecs: Number,
    expiresAt: Date,
    autoReleaseMins: Number,
    paidAt: Date,
    releasedAt: Date,
    evidence: [
      {
        by: Schema.Types.ObjectId,
        type: String,
        url: String,
        note: String,
        at: Date,
      },
    ],
  },
  { timestamps: true }
);
export default model('Trade', TradeSchema);
