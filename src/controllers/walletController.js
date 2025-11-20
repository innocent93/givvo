import Wallet from '../models/Wallet.js';
import LedgerEntry from '../models/LedgerEntry.js';
import { ensureWallet } from '../services/walletService.js';
import BitgoService from '../services/bitgoService.js';

/**
 * @desc List all wallets for the logged-in user
 */
export async function list(req, res) {
  try {
    const wallets = await Wallet.find({ userId: req.user.id });
    res.status(200).json({
      success: true,
      count: wallets.length,
      wallets,
    });
  } catch (err) {
    console.error('Wallet list error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch wallets' });
  }
}

/**
 * @desc Ensure a wallet exists (creates if not)
 */
export async function ensure(req, res) {
  try {
    const { currency } = req.body;
    if (!currency) {
      return res
        .status(400)
        .json({ success: false, message: 'Currency is required' });
    }

    const wallet = await ensureWallet(req.user.id, currency);

    res.status(200).json({
      success: true,
      message: `Wallet ensured for ${currency}`,
      wallet,
    });
  } catch (err) {
    console.error('Ensure wallet error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to ensure wallet' });
  }
}

/**
 * @desc Fetch wallet transactions
 */
export async function transactions(req, res) {
  try {
    const { currency, limit = 100, page = 1 } = req.query;

    const wallets = await Wallet.find({
      userId: req.user.id,
      ...(currency ? { currency } : {}),
    });

    const walletIds = wallets.map(w => w._id);

    const txs = await LedgerEntry.find({ walletId: { $in: walletIds } })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit);

    res.status(200).json({
      success: true,
      total: txs.length,
      transactions: txs,
    });
  } catch (err) {
    console.error('Transaction list error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch transactions' });
  }
}




export const generateWallet = async (req, res) => {
  try {
    const { coin, label, passphrase } = req.body;
    const r = await BitgoService.generateWallet({ coin, label, passphrase });
    const bitgoWalletId = r?.wallet?.id || r?.id || r?.walletId;
    const w = await Wallet.create({
      coin,
      bitgoWalletId,
      label,
      type: 'platform',
    });
    return res.json({ ok: true, wallet: w, raw: r });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};
