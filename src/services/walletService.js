import Wallet from '../models/Wallet.js';
import LedgerEntry from '../models/LedgerEntry.js';
import custody from './custodyProvider.js';

export async function ensureWallet(userId, currency) {
  let w = await Wallet.findOne({ userId, currency });
  if (!w) {
    w = await Wallet.create({ userId, currency, available: 0, locked: 0 });
    const external = await custody.createWallet(userId, currency);
    if (external?.depositAddress) w.depositAddress = external.depositAddress;
    await w.save();
  }
  return w;
}

export async function credit(userId, currency, amount, ref, meta = {}) {
  const w = await ensureWallet(userId, currency);
  w.available += Number(amount);
  await w.save();

  await LedgerEntry.create({
    walletId: w._id,
    type: 'deposit',
    amount: Number(amount),
    currency,
    ref,
    meta,
    balanceAfter: w.available,
  });

  return w;
}

export async function lock(userId, currency, amount, ref) {
  const w = await ensureWallet(userId, currency);
  if (w.available < amount) throw new Error('INSUFFICIENT_FUNDS');
  w.available -= amount;
  w.locked += amount;
  await w.save();

  await LedgerEntry.create({
    walletId: w._id,
    type: 'trade_lock',
    amount: -amount,
    currency,
    ref,
    balanceAfter: w.available,
  });

  return w;
}

export async function releaseTo(fromUserId, toUserId, currency, amount, ref) {
  const from = await ensureWallet(fromUserId, currency);
  if (from.locked < amount) throw new Error('INSUFFICIENT_LOCKED');
  from.locked -= amount;
  await from.save();

  await LedgerEntry.create({
    walletId: from._id,
    type: 'trade_release',
    amount: 0,
    currency,
    ref,
    balanceAfter: from.available,
  });

  const to = await ensureWallet(toUserId, currency);
  to.available += amount;
  await to.save();

  await LedgerEntry.create({
    walletId: to._id,
    type: 'deposit',
    amount,
    currency,
    ref,
    balanceAfter: to.available,
  });

  return { from, to };
}
