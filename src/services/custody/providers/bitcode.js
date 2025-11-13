// Bitcode custody stub (replace endpoints with your vendor)
import axios from 'axios';
const api = axios.create({
  baseURL: process.env.BITCODE_BASE_URL || 'https://api.bitcode.example/v1',
  headers: { Authorization: `Bearer ${process.env.BITCODE_API_KEY || ''}` },
});
export async function createWallet({ label = 'naelix' }) {
  const { data } = await api.post('/wallets', { label });
  return data;
}
export async function getAddress({ walletId }) {
  const { data } = await api.post(`/wallets/${walletId}/addresses`, {});
  return data;
}
export async function getBalance({ walletId, asset = 'BTC' }) {
  const { data } = await api.get(`/wallets/${walletId}/balances`, {
    params: { asset },
  });
  return data;
}
export async function createTransaction({
  walletId,
  asset = 'BTC',
  to,
  amount,
  memo,
}) {
  const { data } = await api.post(`/wallets/${walletId}/transactions`, {
    asset,
    to,
    amount,
    memo,
  });
  return data;
}
export async function parseWebhook(body) {
  return body;
}
