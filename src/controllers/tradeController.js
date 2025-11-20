import Trade from '../models/Trade.js';
import Escrow from '../models/Escrow.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

export const createOffer = async (req, res) => {
  try {
    const { type, offer, description } = req.body;

    const trade = new Trade({
      initiator: req.user.id,
      type,
      offer,
      status: 'pending',
    });

    await trade.save();

    res.status(201).json({
      message: 'Offer created',
      trade,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOffers = async (req, res) => {
  try {
    const { type, currency, minPrice, maxPrice, sortBy } = req.query;

    const filter = { status: 'pending', type };

    if (minPrice || maxPrice) {
      filter['offer.pricePerUnit'] = {};
      if (minPrice)
        filter['offer.pricePerUnit'].$gte = Number.parseFloat(minPrice);
      if (maxPrice)
        filter['offer.pricePerUnit'].$lte = Number.parseFloat(maxPrice);
    }

    let query = Trade.find(filter)
      .populate('initiator', 'username profile.avatar tradingStats')
      .sort({ createdAt: -1 });

    if (sortBy === 'price_low') query = query.sort({ 'offer.pricePerUnit': 1 });
    if (sortBy === 'price_high')
      query = query.sort({ 'offer.pricePerUnit': -1 });
    if (sortBy === 'rating')
      query = query.sort({ 'initiator.tradingStats.averageRating': -1 });

    const offers = await query.limit(100);

    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const acceptOffer = async (req, res) => {
  try {
    const { tradeId } = req.body;

    const trade = await Trade.findById(tradeId);

    if (!trade || trade.status !== 'pending') {
      return res.status(400).json({ message: 'Trade not available' });
    }

    trade.responder = req.user.id;
    trade.status = 'accepted';
    trade.acceptedAt = new Date();
    await trade.save();

    // Create escrow
    const escrow = new Escrow({
      trade: tradeId,
      buyer:
        trade.type === 'bitcoin' && trade.offer.type === 'buy'
          ? req.user.id
          : trade.initiator,
      seller:
        trade.type === 'bitcoin' && trade.offer.type === 'buy'
          ? trade.initiator
          : req.user.id,
      amount: trade.offer.totalPrice,
      currency: trade.offer.currency || 'USD',
      status: 'locked',
    });

    await escrow.save();

    trade.escrow = escrow._id;
    await trade.save();

    // Create chat room
    const chat = new Chat({
      trade: tradeId,
      participants: [trade.initiator, req.user.id],
    });

    await chat.save();

    // Send notifications
    await Notification.create({
      user: trade.initiator,
      type: 'trade',
      title: 'Offer Accepted',
      message: 'Your offer has been accepted',
      relatedTo: { model: 'Trade', id: tradeId },
    });

    res.json({
      message: 'Offer accepted',
      trade,
      escrow,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTradeDetail = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id)
      .populate('initiator', 'username profile tradingStats')
      .populate('responder', 'username profile tradingStats')
      .populate('escrow')
      .populate('giftCard');

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTradeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    if (
      trade.initiator.toString() !== req.user.id &&
      trade.responder.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    trade.status = status;

    if (status === 'completed') {
      trade.completedAt = new Date();

      // Update user stats
      const initiator = await User.findById(trade.initiator);
      const responder = await User.findById(trade.responder);

      initiator.tradingStats.completedTrades += 1;
      responder.tradingStats.completedTrades += 1;

      await initiator.save();
      await responder.save();
    }

    await trade.save();

    res.json({
      message: 'Trade status updated',
      trade,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelTrade = async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    if (
      trade.initiator.toString() !== req.user.id &&
      trade.responder.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    trade.status = 'cancelled';
    trade.cancelledAt = new Date();
    await trade.save();

    res.json({ message: 'Trade cancelled' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitRating = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    if (trade.initiator.toString() === req.user.id) {
      trade.responderRating = { rating, review, submittedAt: new Date() };
    } else if (trade.responder.toString() === req.user.id) {
      trade.initiatorRating = { rating, review, submittedAt: new Date() };
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await trade.save();

    // Update user rating
    const ratedUser =
      trade.initiator.toString() === req.user.id
        ? trade.responder
        : trade.initiator;

    const userTrades = await Trade.find({
      $or: [{ initiator: ratedUser }, { responder: ratedUser }],
      $or: [
        { initiatorRating: { $exists: true } },
        { responderRating: { $exists: true } },
      ],
    });

    const totalRating = userTrades.reduce((sum, t) => {
      const userRating =
        t.initiator.toString() === ratedUser.toString()
          ? t.responderRating?.rating
          : t.initiatorRating?.rating;
      return sum + (userRating || 0);
    }, 0);

    const user = await User.findById(ratedUser);
    user.tradingStats.averageRating = totalRating / userTrades.length;
    user.tradingStats.totalReviews = userTrades.length;
    await user.save();

    res.json({
      message: 'Rating submitted',
      trade,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyTrades = async (req, res) => {
  try {
    const trades = await Trade.find({
      $or: [{ initiator: req.user.id }, { responder: req.user.id }],
    })
      .populate('initiator', 'username profile')
      .populate('responder', 'username profile')
      .sort({ createdAt: -1 });

    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
