import { getTicker, convert, quoteOffer } from '../services/priceService.js';
import Offer from '../models/Offer.js';
export async function tickers(req, res, next) {
  try {
    const assets = (req.query.assets || 'BTC,USDT')
      .split(',')
      .map(s => s.trim().toUpperCase());
    const fiat = (req.query.fiat || 'USD').toUpperCase();
    const out = [];
    for (const a of assets) {
      out.push(await getTicker({ asset: a, fiat }));
    }
    res.json(out);
  } catch (e) {
    next(e);
  }
}
export async function convertPrice(req, res, next) {
  try {
    const { from, to, amount } = req.body;
    res.json(await convert({ from, to, amount: Number(amount) }));
  } catch (e) {
    next(e);
  }
}
export async function quoteForOffer(req, res, next) {
  try {
    const o = await Offer.findById(req.params.id);
    if (!o || o.status !== 'active')
      return res.status(404).json({ error: 'OFFER_NOT_FOUND' });
    const q = await quoteOffer(o, {
      amountFiat: Number(req.query.amountFiat || o.min),
    });
    res.json({ offerId: o._id, ...q, fiat: o.fiatCurrency, asset: o.asset });
  } catch (e) {
    next(e);
  }
}
