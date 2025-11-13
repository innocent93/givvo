import { getCustody } from '../services/custody/index.js';
export async function createWallet(req, res, next) {
  try {
    const api = getCustody();
    res.json(await api.createWallet({ label: `${req.user.id}` }));
  } catch (e) {
    next(e);
  }
}
export async function newAddress(req, res, next) {
  try {
    const api = getCustody();
    res.json(await api.getAddress({ walletId: req.params.walletId }));
  } catch (e) {
    next(e);
  }
}
export async function balance(req, res, next) {
  try {
    const api = getCustody();
    res.json(
      await api.getBalance({
        walletId: req.params.walletId,
        asset: req.query.asset || 'BTC',
      })
    );
  } catch (e) {
    next(e);
  }
}
export async function send(req, res, next) {
  try {
    const api = getCustody();
    res.json(
      await api.createTransaction({
        walletId: req.params.walletId,
        asset: req.body.asset || 'BTC',
        to: req.body.to,
        amount: req.body.amount,
        memo: req.body.memo,
      })
    );
  } catch (e) {
    next(e);
  }
}
export async function webhook(req, res) {
  res.sendStatus(200);
}
