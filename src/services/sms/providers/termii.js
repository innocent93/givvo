import axios from 'axios';
const api = axios.create({
  baseURL: 'https://api.ng.termii.com/api',
  headers: { 'Content-Type': 'application/json' },
});
export async function send({ to, message, from }) {
  const { data } = await api.post('/sms/send', {
    to,
    from: from || 'Naelix',
    sms: message,
    type: 'plain',
    channel: 'generic',
    api_key: process.env.TERMII_API_KEY,
  });
  return data;
}
