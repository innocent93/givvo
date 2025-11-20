import GiftCard from '../models/GiftCard.js';
import Trade from '../models/Trade.js';

export const createListing = async (req, res) => {
  try {
    const {
      cardType,
      denomination,
      currency,
      price,
      discount,
      cardCode,
      cardImage,
    } = req.body;

    const giftCard = new GiftCard({
      seller: req.user.id,
      cardType,
      denomination,
      currency,
      price,
      discount,
      cardCode,
      cardImage,
      status: 'available',
    });

    await giftCard.save();

    res.status(201).json({
      message: 'Gift card listing created',
      giftCard,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getListings = async (req, res) => {
  try {
    const { cardType, minPrice, maxPrice, sortBy } = req.query;

    const filter = { status: 'available' };

    if (cardType) filter.cardType = cardType;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number.parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = Number.parseFloat(maxPrice);
    }

    let query = GiftCard.find(filter).populate(
      'seller',
      'username profile.avatar tradingStats.averageRating'
    );

    if (sortBy === 'price_low') query = query.sort({ price: 1 });
    if (sortBy === 'price_high') query = query.sort({ price: -1 });
    if (sortBy === 'newest') query = query.sort({ createdAt: -1 });

    const listings = await query.limit(50);

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getListingDetail = async (req, res) => {
  try {
    const giftCard = await GiftCard.findById(req.params.id).populate(
      'seller',
      'username profile tradingStats'
    );

    if (!giftCard) {
      return res.status(404).json({ message: 'Gift card not found' });
    }

    res.json(giftCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const buyGiftCard = async (req, res) => {
  try {
    const { giftCardId } = req.body;

    const giftCard = await GiftCard.findById(giftCardId);

    if (!giftCard || giftCard.status !== 'available') {
      return res.status(400).json({ message: 'Gift card not available' });
    }

    // Create trade
    const trade = new Trade({
      initiator: req.user.id,
      responder: giftCard.seller,
      type: 'giftcard',
      giftCard: giftCardId,
      status: 'pending',
    });

    await trade.save();

    giftCard.buyer = req.user.id;
    giftCard.trade = trade._id;
    giftCard.status = 'sold';
    await giftCard.save();

    res.status(201).json({
      message: 'Purchase initiated',
      trade,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelListing = async (req, res) => {
  try {
    const giftCard = await GiftCard.findById(req.params.id);

    if (!giftCard) {
      return res.status(404).json({ message: 'Gift card not found' });
    }

    if (giftCard.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (giftCard.status !== 'available') {
      return res.status(400).json({ message: 'Cannot cancel this listing' });
    }

    giftCard.status = 'cancelled';
    await giftCard.save();

    res.json({ message: 'Listing cancelled' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyListings = async (req, res) => {
  try {
    const listings = await GiftCard.find({ seller: req.user.id }).sort({
      createdAt: -1,
    });

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyGiftCard = async (req, res) => {
  try {
    const { giftCardId, verificationMethod } = req.body;

    const giftCard = await GiftCard.findById(giftCardId);

    if (!giftCard) {
      return res.status(404).json({ message: 'Gift card not found' });
    }

    // Simulate verification with external API
    giftCard.verified = true;
    giftCard.verificationMethod = verificationMethod;
    await giftCard.save();

    res.json({
      message: 'Gift card verified',
      giftCard,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
