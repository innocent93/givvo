import Dispute from '../models/Dispute.js';
import Trade from '../models/Trade.js';
import Escrow from '../models/Escrow.js';
import Notification from '../models/Notification.js';

export const createDispute = async (req, res) => {
  try {
    const { tradeId, reason, description, evidence } = req.body;

    const trade = await Trade.findById(tradeId);

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    if (
      trade.initiator.toString() !== req.user.id &&
      trade.responder.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const respondent =
      trade.initiator.toString() === req.user.id
        ? trade.responder
        : trade.initiator;

    const dispute = new Dispute({
      trade: tradeId,
      initiator: req.user.id,
      respondent,
      reason,
      description,
      evidence: evidence || [],
      status: 'open',
    });

    await dispute.save();

    // Update trade status
    trade.status = 'disputed';
    await trade.save();

    // Update escrow status
    if (trade.escrow) {
      const escrow = await Escrow.findById(trade.escrow);
      escrow.status = 'disputed';
      escrow.dispute = dispute._id;
      await escrow.save();
    }

    // Send notifications
    await Notification.create({
      user: respondent,
      type: 'dispute',
      title: 'Dispute Opened',
      message: 'A dispute has been opened for your trade',
      relatedTo: { model: 'Dispute', id: dispute._id },
    });

    res.status(201).json({
      message: 'Dispute created',
      dispute,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('trade')
      .populate('initiator', 'username profile')
      .populate('respondent', 'username profile')
      .populate('resolvedBy', 'email');

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitEvidence = async (req, res) => {
  try {
    const { evidence } = req.body;

    const dispute = await Dispute.findById(req.params.id);

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    if (
      dispute.initiator.toString() !== req.user.id &&
      dispute.respondent.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    dispute.evidence.push({
      type: String,
      uploadedAt: new Date(),
    });

    await dispute.save();

    res.json({
      message: 'Evidence submitted',
      dispute,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resolveDispute = async (req, res) => {
  try {
    const { resolution, resolutionNotes } = req.body;

    const dispute = await Dispute.findById(req.params.id);

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolutionNotes = resolutionNotes;
    dispute.resolvedBy = req.admin.id;
    dispute.resolvedAt = new Date();

    await dispute.save();

    // Handle escrow based on resolution
    const trade = await Trade.findById(dispute.trade);
    const escrow = await Escrow.findById(trade.escrow);

    if (resolution === 'refund_buyer') {
      escrow.status = 'refunded';

      await Notification.create({
        user: escrow.buyer,
        type: 'dispute',
        title: 'Dispute Resolved - Refund Issued',
        message: 'Your dispute has been resolved and a refund has been issued',
        relatedTo: { model: 'Dispute', id: dispute._id },
      });

      await Notification.create({
        user: escrow.seller,
        type: 'dispute',
        title: 'Dispute Resolved - Refund Issued',
        message:
          'The dispute has been resolved and a refund has been issued to the buyer',
        relatedTo: { model: 'Dispute', id: dispute._id },
      });
    } else if (resolution === 'release_to_seller') {
      escrow.status = 'released';
      escrow.releasedAt = new Date();

      await Notification.create({
        user: escrow.seller,
        type: 'dispute',
        title: 'Dispute Resolved - Payment Released',
        message: 'Your dispute has been resolved and payment has been released',
        relatedTo: { model: 'Dispute', id: dispute._id },
      });

      await Notification.create({
        user: escrow.buyer,
        type: 'dispute',
        title: 'Dispute Resolved',
        message:
          'The dispute has been resolved and payment has been released to the seller',
        relatedTo: { model: 'Dispute', id: dispute._id },
      });
    }

    await escrow.save();

    res.json({
      message: 'Dispute resolved',
      dispute,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find({
      $or: [{ initiator: req.user.id }, { respondent: req.user.id }],
    })
      .populate('trade')
      .populate('initiator', 'username')
      .populate('respondent', 'username')
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllDisputes = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const disputes = await Dispute.find(filter)
      .populate('trade')
      .populate('initiator', 'username email')
      .populate('respondent', 'username email')
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
