import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const LedgerEntrySchema = new Schema(
  {
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', index: true },
    type: {
      type: String,
      enum: [
        'deposit',
        'withdrawal',
        'trade_lock',
        'trade_release',
        'refund',
        'fee',
      ],
    },
    amount: Number,
    currency: String,
    ref: String,
    meta: Schema.Types.Mixed,
    balanceAfter: Number,
  },
  { timestamps: true }
);
export default model('LedgerEntry', LedgerEntrySchema);
