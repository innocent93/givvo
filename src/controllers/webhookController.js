import Trade from '../models/Trade.js';
import BitgoService from '../services/bitgoService.js';
import Big from 'big.js';
import { addStrings } from '../utils/units.js';

export const bitgoWebhook = async (req, res) => {
  try {
    const raw = req.rawBody || JSON.stringify(req.body);
    // For dev, allow bypass if no secret set
    const verified =
      BitgoService.verifyWebhook({ bodyRaw: raw, headers: req.headers }) ||
      !process.env.WEBHOOK_SECRET;
    if (!verified) return res.status(401).send('invalid signature');

    const payload = req.body;
    const data = payload.data || {};
    const txid = data.id || data.txid || data.transactionHash;
    const confirmations = Number(data.confirmations || 0);
    const outputs = data.outputs || data.vout || [];

    const addresses = outputs
      .flatMap(o => (o.address ? [o.address] : o.addresses || []))
      .filter(Boolean);
    if (!txid || addresses.length === 0)
      return res.status(200).send('no tx or outputs');

    // find matching trades
    const trades = await Trade.find({ depositAddress: { $in: addresses } });
    if (!trades || trades.length === 0) return res.status(200).send('ok');

    for (const trade of trades) {
      // idempotency: skip if txid already processed for this trade
      const already = trade.events?.some(e => e.payload?.txid === txid);
      if (already) continue;

      // Sum outputs that belong to this trade
      let sum = Big(0);
      for (const out of outputs) {
        const outAddresses = out.address ? [out.address] : out.addresses || [];
        if (outAddresses.includes(trade.depositAddress)) {
          // common numeric fields
          const v =
            out.value ||
            out.valueSat ||
            out.amount ||
            out.satoshis ||
            out.amountValue ||
            0;
          sum = sum.plus(Big(String(v)));
        }
      }

      const prevReceived = Big(trade.receivedAmount || '0');
      const nextReceived = prevReceived.plus(sum);
      trade.receivedAmount = nextReceived.toFixed(0);
      trade.confirmations = Math.max(trade.confirmations || 0, confirmations);

      const required = Big(trade.amount || '0');
      if (
        nextReceived.gte(required) &&
        trade.confirmations >= trade.confirmationsRequired
      ) {
        trade.status = 'funded';
        trade.bitgoDepositTxId = txid;
      } else if (nextReceived.gt(0)) {
        trade.status = 'partially_funded';
      }

      trade.events.push({
        type: 'webhook',
        payload: { txid, confirmations, outputs },
        eventId: payload.id || txid,
      });
      await trade.save();

      // emit via socket.io
      if (global.io)
        global.io.to(String(trade._id)).emit('trade.update', {
          tradeId: trade._id,
          status: trade.status,
          receivedAmount: trade.receivedAmount,
          confirmations: trade.confirmations,
        });
    }

    return res.status(200).send('ok');
  } catch (err) {
    console.error('webhook err', err);
    return res.status(500).send('error');
  }
};
