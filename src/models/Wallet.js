import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const WalletSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    currency: String,
    available: { type: Number, default: 0 },
    locked: { type: Number, default: 0 },
    depositAddress: { type: String }, // added field
    coin: String, // 'tbtc' | 'tbch' | 'teth' etc (use testnet or mainnet tokens)
    bitgoWalletId: String, // BitGo wallet id
    label: String,
    type: { type: String, default: 'platform' }, // 'platform'|'escrow'|'user'
    metadata: Object,
  },
  { timestamps: true }
);
export default model('Wallet', WalletSchema);
