import { getSMS } from '../services/sms/index.js';
export async function send(req, res, next) {
  try {
    const sms = getSMS();
    const out = await sms.send({
      to: req.body.to,
      message: req.body.message,
      from: req.body.from,
    });
    res.json(out);
  } catch (e) {
    next(e);
  }
}
