import axios from 'axios';
const api = axios.create({
  baseURL: process.env.KORA_BASE_URL || 'https://api.korapay.com/merchant/api',
  headers: {
    Authorization: `Bearer ${process.env.KORA_SECRET_KEY || ''}`,
    'Content-Type': 'application/json',
  },
});
export async function initializeCharge({ amount, currency = 'NGN', customer }) {
  const { data } = await api.post('/v1/charges/initialize', {
    amount,
    currency,
    customer,
    reference: `kora_${Date.now()}`,
    narration: 'Wallet top-up',
  });
  return data;
}
export async function verifyCharge(reference) {
  const { data } = await api.get(`/v1/charges/${reference}`);
  return data;
}
