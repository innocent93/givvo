import axios from 'axios';
const cache = new Map();
function setCache(k, v, ttl = 30) {
  cache.set(k, { v, exp: Date.now() + ttl * 1000 });
}
function getCache(k) {
  const it = cache.get(k);
  if (!it) return null;
  if (it.exp < Date.now()) {
    cache.delete(k);
    return null;
  }
  return it.v;
}
async function fetchBinance(symbol) {
  const { data } = await axios.get(
    `${process.env.BINANCE_BASE_URL || 'https://api.binance.com'}/api/v3/ticker/price`,
    { params: { symbol } }
  );
  return Number(data.price);
}
async function fetchCoinbase(product) {
  const { data } = await axios.get(
    `${process.env.COINBASE_BASE_URL || 'https://api.coinbase.com'}/v2/prices/${product}/spot`
  );
  return Number(data.data.amount);
}
async function fetchFx(base = 'USD', quote = 'NGN') {
  const url =
    process.env.NGN_USD_ORACLE ||
    `https://api.exchangerate.host/latest?base=${base}&symbols=${quote}`;
  const { data } = await axios.get(url);
  return Number(data.rates[quote]);
}
export async function getTicker({ asset = 'BTC', fiat = 'USD' }) {
  const key = `t:${asset}:${fiat}`;
  const hit = getCache(key);
  if (hit) return hit;
  let px;
  try {
    if (fiat === 'USD') px = await fetchCoinbase(`${asset}-USD`);
    else if (fiat === 'USDT') px = await fetchBinance(`${asset}USDT`);
    else {
      const usd = await fetchCoinbase(`${asset}-USD`);
      const fx = await fetchFx('USD', fiat);
      px = usd * fx;
    }
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    const usdt = await fetchBinance(`${asset}USDT`);
    if (fiat === 'USDT') px = usdt;
    else {
      const fx = await fetchFx('USD', fiat);
      px = usdt * fx;
    }
  }
  const out = { asset, fiat, price: Number(px) };
  setCache(key, out, Number(process.env.PRICE_CACHE_TTL || 30));
  return out;
}
export async function convert({ from, to, amount }) {
  if (from === to) return { from, to, amount, result: amount, rate: 1 };
  const fiat = ['USD', 'NGN', 'EUR', 'GBP', 'GHS', 'KES', 'ZAR', 'USDT'];
  const isFromFiat = fiat.includes((from || '').toUpperCase());
  const isToFiat = fiat.includes((to || '').toUpperCase());
  let rate;
  if (!isFromFiat && isToFiat) {
    const t = await getTicker({ asset: from, fiat: to });
    rate = t.price;
    return { from, to, amount, result: amount * rate, rate };
  }
  if (isFromFiat && !isToFiat) {
    const t = await getTicker({ asset: to, fiat: from });
    rate = 1 / t.price;
    return { from, to, amount, result: amount * rate, rate };
  }
  if (from === 'USDT') from = 'USD';
  if (to === 'USDT') to = 'USD';
  const fx = await fetchFx(from, to);
  rate = fx;
  return { from, to, amount, result: amount * rate, rate };
}
export async function quoteOffer(offer, { amountFiat }) {
  let unitPrice;
  if (offer.priceType === 'fixed') unitPrice = offer.fixedPrice;
  else {
    const ref = await getTicker({
      asset: offer.asset || 'BTC',
      fiat: offer.fiatCurrency || 'USD',
    });
    const margin = Number(offer.floatMarginBps || 0) / 10000;
    unitPrice = ref.price * (1 + margin);
  }
  const qty = amountFiat / unitPrice;
  return { unitPrice, qtyCrypto: qty, amountFiat };
}
