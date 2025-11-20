import cron from 'node-cron';
import Trade from '../models/Trade.js';

export default function startExpiryWorker() {
  // every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();
    const expired = await Trade.find({
      status: 'created',
      escrowExpiresAt: { $lte: now },
    });
    for (const t of expired) {
      t.status = 'cancelled';
      t.events.push({ type: 'auto.cancel', payload: { at: now } });
      await t.save();
      if (global.io)
        global.io
          .to(String(t._id))
          .emit('trade.update', { tradeId: t._id, status: t.status });
    }
  });
}
