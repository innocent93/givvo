import Offer from '../models/Offer.js';
import Trade from '../models/Trade.js';
import { lock, releaseTo } from './walletService.js';
import { quoteOffer } from './priceService.js';
export async function createOffer(makerId, dto) {
  return Offer.create({ makerId, ...dto });
}
export async function listOffers(q) {
  const cond = { active: true, status: 'active' };
  if (q.fiatCurrency) cond.fiatCurrency = q.fiatCurrency.toUpperCase();
  if (q.side) cond.side = q.side;
  if (q.method) cond.paymentMethods = q.method;
  return Offer.find(cond).sort({ createdAt: -1 }).limit(200);
}
export async function pauseOffer(offerId, userId) {
  return Offer.findOneAndUpdate(
    { _id: offerId, makerId: userId },
    { $set: { status: 'paused' } },
    { new: true }
  );
}
export async function deleteOffer(offerId, userId) {
  return Offer.findOneAndUpdate(
    { _id: offerId, makerId: userId },
    { $set: { status: 'deleted', active: false } },
    { new: true }
  );
}
export async function initiateTrade(offerId, takerId, amountFiat) {
  const offer = await Offer.findById(offerId);
  if (!offer || !offer.active || offer.status !== 'active')
    throw new Error('OFFER_NOT_AVAILABLE');
  if (amountFiat < offer.min || amountFiat > offer.max)
    throw new Error('AMOUNT_OUT_OF_RANGE');
  const q = await quoteOffer(offer, { amountFiat });
  const amountBTC = q.qtyCrypto;
  const price = q.unitPrice;
  const buyerId = offer.side === 'sell' ? takerId : offer.makerId;
  const sellerId = offer.side === 'sell' ? offer.makerId : takerId;
  const trade = await Trade.create({
    offerId,
    buyerId,
    sellerId,
    side: offer.side,
    fiatCurrency: offer.fiatCurrency,
    amountFiat,
    amountBTC,
    price,
    state: 'initiated',
    countdownSecs: 900,
    autoReleaseMins: offer.autoReleaseMins || 15,
  });
  await lock(sellerId, 'BTC', amountBTC, `trade:${trade._id}`);
  trade.state = 'escrow_locked';
  await trade.save();
  return trade;
}
export async function markPaid(tradeId, byUserId, proofUrl, note) {
  const t = await Trade.findById(tradeId);
  if (!t) throw new Error('NOT_FOUND');
  t.state = 'paid';
  t.paidAt = new Date();
  t.evidence.push({
    by: byUserId,
    type: 'payment_proof',
    url: proofUrl,
    note,
    at: new Date(),
  });
  await t.save();
  return t;
}
export async function release(tradeId, byUserId) {
  const t = await Trade.findById(tradeId);
  if (!t || t.sellerId.toString() !== byUserId) throw new Error('NOT_ALLOWED');
  await releaseTo(t.sellerId, t.buyerId, 'BTC', t.amountBTC, `trade:${t._id}`);
  t.state = 'released';
  t.releasedAt = new Date();
  await t.save();
  return t;
}
