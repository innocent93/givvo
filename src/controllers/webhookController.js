import Trade from '../models/Trade.js';
import BitgoService from '../services/bitgoService.js';

export const bitgoWebhook = async (req, res) => {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const verified = BitgoService.verifyWebhook({
      bodyRaw: rawBody,
      headers: req.headers,
    });
    if (!verified) return res.status(401).send('invalid signature');

    const payload = req.body;
    const eventId =
      payload.id ||
      payload.eventId ||
      payload.txid ||
      JSON.stringify(payload).slice(0, 200);
    const type = payload.type;
    const data = payload.data || {};
    const txid = data.id || data.txid || data.transactionHash;
    const confirmations = data.confirmations || 0;
    const outputs = data.outputs || data.vout || [];
    const addresses = outputs
      .map(o => o.address || o.addresses)
      .flat()
      .filter(Boolean);

    if (!txid) {
      console.warn('webhook missing txid', payload);
      return res.status(400).send('no tx id');
    }

    // find trade by depositAddress
    const trade = await Trade.findOne({ depositAddress: { $in: addresses } });
    if (!trade) {
      console.log('webhook: deposit to unknown address', addresses);
      return res.status(200).send('ok');
    }

    // idempotency: if we've already processed this txid or eventId, skip
    const already = trade.events.find(
      e =>
        e.eventId === eventId ||
        (e.payload && (e.payload.txid === txid || e.payload.id === txid))
    );
    if (already) {
      return res.status(200).send('duplicate');
    }

    // persist event
    trade.events.push({ type: `webhook.${type}`, payload: data, eventId });

    // mark funded on confirmations threshold
    const need = trade.confirmationsRequired || 2;
    if (confirmations >= need && trade.status === 'created') {
      trade.status = 'funded';
      trade.bitgoDepositTxId = txid;
      // optionally record funding time
      trade.events.push({
        type: 'funded',
        payload: { txid, confirmations },
        eventId: `fund-${txid}`,
      });
      // notify buyer/seller...
    }

    await trade.save();
    return res.status(200).send('ok');
  } catch (err) {
    console.error('bitgoWebhook error', err);
    return res.status(500).send('error');
  }
};
