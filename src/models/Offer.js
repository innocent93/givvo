import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const OfferSchema = new Schema(
  {
    makerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    side: { type: String, enum: ['buy', 'sell'], index: true },
    asset: { type: String, enum: ['BTC', 'USDT', 'USDC'], default: 'BTC' },
    priceType: { type: String, enum: ['fixed', 'float'] },
    fixedPrice: Number,
    floatMarginBps: Number,
    min: Number,
    max: Number,
    paymentMethods: [String],
    fiatCurrency: String,
    terms: String,
    autoReleaseMins: Number,
    location: String,
    active: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'paused', 'deleted'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);
export default model('Offer', OfferSchema);
