import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const EventSchema = new Schema(
  {
    type: String,
    payload: Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
    eventId: String, // webhook/event id for idempotency
  },
  { _id: false }
);

const TradeSchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
    coin: { type: String, required: true }, // e.g. 'tbtc' or 'teth'
    amount: { type: String, required: true }, // string for big decimals (satoshis/wei)
    price: Number,
    status: {
      type: String,
      enum: [
        'created',
        'funded',
        'released',
        'cancelled',
        'disputed',
        'refunded',
      ],
      default: 'created',
    },
    depositAddress: String,
    bitgoDepositTxId: String,
    confirmationsRequired: { type: Number, default: 2 },

    // escrow-specific
    escrowWalletId: String, // optional: if you use a dedicated escrow wallet id
    escrowExpiresAt: Date, // timeframe to auto-cancel if not funded
    dispute: {
      open: { type: Boolean, default: false },
      reason: String,
      openedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      openedAt: Date,
    },

    events: [EventSchema], // keep webhook events / actions for idempotency & audit
  },
  { timestamps: true }
);

export default model('Trade', TradeSchema);

// import mongoose from 'mongoose';
// const { Schema, model } = mongoose;
// const TradeSchema = new Schema(
//   {
//     offerId: { type: Schema.Types.ObjectId, ref: 'Offer' },
//     buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
//     sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
//     side: String,
//     amount: String,
//     fiatCurrency: String,
//     amountFiat: Number,
//     amountBTC: Number,
//     price: Number,
//     status: {
//       type: String,
//       enum: ['created', 'funded', 'released', 'cancelled'],
//       default: 'created',
//     },
//     depositAddress: String, // address buyer must send to
//     bitgoDepositTxId: String, // tx id when deposit is seen
//     confirmationsRequired: { type: Number, default: 2 },
//     state: {
//       type: String,
//       enum: [
//         'initiated',
//         'escrow_locked',
//         'paid',
//         'released',
//         'disputed',
//         'cancelled',
//       ],
//       index: true,
//     },
//     countdownSecs: Number,
//     expiresAt: Date,
//     autoReleaseMins: Number,
//     paidAt: Date,
//     releasedAt: Date,
//     evidence: [
//       {
//         by: Schema.Types.ObjectId,
//         type: String,
//         url: String,
//         note: String,
//         at: Date,
//       },
//     ],
//   },
//   { timestamps: true }
// );
// export default model('Trade', TradeSchema);
