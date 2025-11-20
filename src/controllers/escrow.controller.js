import Escrow from '../models/Escrow.js';
import Trade from '../models/Trade.js';
import Notification from '../models/Notification.js';

export const confirmPayment = async (req, res) => {
  try {
    const { escrowId } = req.body;

    const escrow = await Escrow.findById(escrowId);

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    if (escrow.buyer.toString() === req.user.id) {
      escrow.buyerConfirmed = true;
    } else if (escrow.seller.toString() === req.user.id) {
      escrow.sellerConfirmed = true;
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Auto-release if both confirmed
    if (escrow.buyerConfirmed && escrow.sellerConfirmed) {
      escrow.status = 'released';
      escrow.releasedAt = new Date();

      // Update trade status
      const trade = await Trade.findById(escrow.trade);
      trade.status = 'completed';
      trade.completedAt = new Date();
      await trade.save();

      // Send notifications
      await Notification.create({
        user: escrow.buyer,
        type: 'escrow',
        title: 'Payment Released',
        message: 'Escrow payment has been released to seller',
        relatedTo: { model: 'Escrow', id: escrowId },
      });

      await Notification.create({
        user: escrow.seller,
        type: 'escrow',
        title: 'Payment Received',
        message: 'You have received the escrow payment',
        relatedTo: { model: 'Escrow', id: escrowId },
      });
    }

    await escrow.save();

    res.json({
      message: 'Payment confirmed',
      escrow,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEscrowDetail = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id)
      .populate('buyer', 'username profile')
      .populate('seller', 'username profile')
      .populate('trade');

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    res.json(escrow);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const releaseEscrow = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    if (escrow.status !== 'locked') {
      return res.status(400).json({ message: 'Escrow cannot be released' });
    }

    escrow.status = 'released';
    escrow.releasedAt = new Date();
    await escrow.save();

    res.json({
      message: 'Escrow released',
      escrow,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const refundEscrow = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    escrow.status = 'refunded';
    await escrow.save();

    // Send notification to buyer
    await Notification.create({
      user: escrow.buyer,
      type: 'escrow',
      title: 'Refund Processed',
      message: 'Your escrow payment has been refunded',
      relatedTo: { model: 'Escrow', id: escrow._id },
    });

    res.json({
      message: 'Escrow refunded',
      escrow,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
