import Trade from '../models/Trade.js';
import WalletModel from '../models/Wallet.js';
import BitgoService from '../services/bitgoService.js';
import mongoose from 'mongoose';

// create an escrow/trade and reserve a deposit address
export const createEscrow = async (req, res) => {
  try {
    const {
      buyerId,
      sellerId,
      coin,
      amount,
      price,
      escrowDurationHours = 24,
    } = req.body;

    // find platform escrow wallet for coin
    const platformWallet = await WalletModel.findOne({
      coin,
      type: 'platform',
    });
    if (!platformWallet)
      return res
        .status(400)
        .json({ ok: false, message: 'No platform wallet for coin' });

    const { address, raw } = await BitgoService.reserveDepositAddress({
      coin: platformWallet.coin,
      walletId: platformWallet.bitgoWalletId,
      label: `escrow-${Date.now()}`,
    });

    const escrowExpiresAt = new Date(
      Date.now() + escrowDurationHours * 60 * 60 * 1000
    );
    const trade = await Trade.create({
      buyerId,
      sellerId,
      coin,
      amount,
      price,
      depositAddress: address,
      escrowWalletId: platformWallet.bitgoWalletId,
      escrowExpiresAt,
      status: 'created',
    });

    return res
      .status(201)
      .json({ ok: true, trade, depositAddress: address, raw });
  } catch (err) {
    console.error('createEscrow error', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// get escrow
export const getEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ ok: false, message: 'invalid id' });
    const trade = await Trade.findById(id);
    if (!trade)
      return res.status(404).json({ ok: false, message: 'Not found' });
    return res.json({ ok: true, trade });
  } catch (err) {
    console.error('getEscrow error', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// Buyer or admin requests release to seller (permission checks expected in auth middleware)
export const releaseEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    const { walletPassphrase, sellerAddress } = req.body; // sellerAddress optional if stored
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ ok: false, message: 'invalid id' });

    const trade = await Trade.findById(id);
    if (!trade)
      return res.status(404).json({ ok: false, message: 'trade not found' });
    if (trade.status !== 'funded' && trade.status !== 'disputed') {
      return res.status(400).json({
        ok: false,
        message: `trade not in fundable state (current: ${trade.status})`,
      });
    }
    if (trade.dispute?.open) {
      // require admin approval for disputed releases
      // assume auth middleware sets req.user and req.user.role
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          ok: false,
          message: 'admin required to release disputed escrow',
        });
      }
    }

    const platformWalletId = trade.escrowWalletId;
    if (!platformWalletId)
      return res
        .status(500)
        .json({ ok: false, message: 'No escrow wallet configured' });

    if (!sellerAddress) {
      // try to get stored seller address from seller profile (not implemented here)
      return res
        .status(400)
        .json({ ok: false, message: 'sellerAddress required' });
    }

    // recipients must be in coin-specific units (for BTC: satoshi; ETH: wei). Expect calling client to provide correct unit or convert here.
    const recipients = [{ address: sellerAddress, amount: trade.amount }];

    const sendRes = await BitgoService.sendFromWallet({
      coin: trade.coin,
      walletId: platformWalletId,
      recipients,
      walletPassphrase,
    });

    trade.status = 'released';
    trade.events.push({
      type: 'released',
      payload: sendRes,
      createdAt: new Date(),
    });
    await trade.save();

    return res.json({ ok: true, sendRes, trade });
  } catch (err) {
    console.error('releaseEscrow error', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// Cancel escrow (before funded) - buyer can cancel or auto-cancel on expiry
export const cancelEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    const trade = await Trade.findById(id);
    if (!trade)
      return res.status(404).json({ ok: false, message: 'trade not found' });
    if (trade.status !== 'created')
      return res
        .status(400)
        .json({ ok: false, message: 'can only cancel when created' });

    trade.status = 'cancelled';
    trade.events.push({
      type: 'cancelled',
      payload: { by: req.user?.id || 'system' },
      createdAt: new Date(),
    });
    await trade.save();
    return res.json({ ok: true, trade });
  } catch (err) {
    console.error('cancelEscrow error', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// Open dispute
export const openDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const trade = await Trade.findById(id);
    if (!trade)
      return res.status(404).json({ ok: false, message: 'trade not found' });

    trade.dispute = {
      open: true,
      reason,
      openedBy: req.user?.id,
      openedAt: new Date(),
    };
    trade.status = 'disputed';
    trade.events.push({
      type: 'dispute.opened',
      payload: { reason, by: req.user?.id },
      createdAt: new Date(),
    });
    await trade.save();
    return res.json({ ok: true, trade });
  } catch (err) {
    console.error('openDispute error', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

// Refund (admin or automatic) - send funds back to buyer
export const refundEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    const { walletPassphrase, buyerAddress } = req.body;
    const trade = await Trade.findById(id);
    if (!trade)
      return res.status(404).json({ ok: false, message: 'trade not found' });
    if (trade.status !== 'funded' && trade.status !== 'disputed') {
      return res.status(400).json({
        ok: false,
        message: `trade not refundable (current: ${trade.status})`,
      });
    }

    // Only admin allowed to refund in disputed flows (or user if policy allows)
    if (trade.dispute?.open && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({
        ok: false,
        message: 'admin required to refund disputed trade',
      });
    }

    if (!buyerAddress)
      return res
        .status(400)
        .json({ ok: false, message: 'buyerAddress required' });

    const recipients = [{ address: buyerAddress, amount: trade.amount }];

    const sendRes = await BitgoService.sendFromWallet({
      coin: trade.coin,
      walletId: trade.escrowWalletId,
      recipients,
      walletPassphrase,
    });

    trade.status = 'refunded';
    trade.events.push({
      type: 'refunded',
      payload: sendRes,
      createdAt: new Date(),
    });
    await trade.save();

    return res.json({ ok: true, sendRes, trade });
  } catch (err) {
    console.error('refundEscrow error', err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};
