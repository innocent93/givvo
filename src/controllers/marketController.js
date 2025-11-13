import GiftCardListing from '../models/GiftCardListing.js';
import GiftCardEscrow from '../models/GiftCardEscrow.js';
import { lock, releaseTo } from '../services/walletService.js';
export async function browse(req, res) {
  const list = await GiftCardListing.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(list);
}
export async function create(req, res, next) {
  try {
    const urls = [];
    for (const f of req.files || []) {
      urls.push(`uploaded://${f.originalname}`);
    }
    const dto = { ...req.body, imageUrls: urls };
    const item = await GiftCardListing.create({
      sellerId: req.user.id,
      ...dto,
    });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
}
export async function buy(req, res, next) {
  try {
    const l = await GiftCardListing.findById(req.params.id);
    if (!l || l.status !== 'active')
      return res.status(404).json({ error: 'LISTING_NOT_AVAILABLE' });
    await lock(req.user.id, l.settlementCurrency, l.price, `giftcard:${l._id}`);
    const esc = await GiftCardEscrow.create({
      listingId: l._id,
      buyerId: req.user.id,
      amount: l.price,
      currency: l.settlementCurrency,
      state: 'locked',
    });
    l.status = 'under_verification';
    await l.save();
    res.json(esc);
  } catch (e) {
    next(e);
  }
}
export async function release(req, res, next) {
  try {
    const esc = await GiftCardEscrow.findById(req.params.id).populate(
      'listingId'
    );
    await releaseTo(
      esc.buyerId,
      esc.listingId.sellerId,
      esc.currency,
      esc.amount,
      `giftcard:${esc._id}`
    );
    esc.state = 'released';
    await esc.save();
    const l = await GiftCardListing.findById(esc.listingId._id);
    l.status = 'sold';
    await l.save();
    res.json(esc);
  } catch (e) {
    next(e);
  }
}
