import * as kora from '../services/korapayService.js';
import { credit } from '../services/walletService.js';
export async function init(req, res, next) {
  try {
    const data = await kora.initializeCharge({
      amount: Number(req.body.amount),
      currency: 'NGN',
      customer: { name: req.user.id, email: req.user.email || 'no@naelix.app' },
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
}
export async function webhook(req, res) {
  try {
    const evt = req.body;
    if (evt.event === 'charge.success') {
      const ref = evt.data.reference;
      const amount = Number(evt.data.amount);
      const userId =
        evt.data.metadata?.userId ||
        req.query.userId ||
        req.headers['x-user-id'];
      if (userId)
        await credit(userId, 'NGN', amount, ref, { channel: 'korapay' });
    }
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(400);
    console.log(e);
  }
}
