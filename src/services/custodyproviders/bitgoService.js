// services/custodyProviders/bitgoService.js
import { BitGo } from 'bitgo';
import dotenv from 'dotenv';
dotenv.config();

const bitgo = new BitGo({
  accessToken: process.env.BITGO_ACCESS_TOKEN,
  env: process.env.BITGO_ENV === 'prod' ? 'prod' : 'test',
});

const enterpriseId = process.env.BITGO_ENTERPRISE_ID;

// Map your currency codes to BitGo coin IDs
const COIN_MAP = {
  BTC: 'tbtc', // testnet BTC
  ETH: 'teth',
  USDT: 'tusdt',
};

export async function createWallet(userId, currency) {
  const coin = bitgo.coin(COIN_MAP[currency] || currency.toLowerCase());
  const label = `wallet-${userId}-${currency}`;
  const result = await coin.wallets().generateWallet({
    enterprise: enterpriseId,
    label,
    passphrase: `pass-${userId}-${Date.now()}`,
  });
  return {
    walletId: result.wallet.id(),
    depositAddress: result.wallet.receiveAddress?.address || null,
  };
}

export async function getDepositAddress(userId, currency) {
  const coin = bitgo.coin(COIN_MAP[currency] || currency.toLowerCase());
  const wallets = await coin.wallets().list({ enterprise: enterpriseId });
  const wallet = wallets.wallets[0];
  const address = await wallet.createAddress();
  return { walletId: wallet.id(), address: address.address };
}

export async function withdraw(userId, currency, amount, address) {
  const coin = bitgo.coin(COIN_MAP[currency] || currency.toLowerCase());
  const wallets = await coin.wallets().list({ enterprise: enterpriseId });
  const wallet = wallets.wallets[0];
  const response = await wallet.sendCoins({
    address,
    amount: Number(amount),
    walletPassphrase: `pass-${userId}`,
  });
  return response;
}
