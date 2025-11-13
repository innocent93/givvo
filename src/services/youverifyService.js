import axios from 'axios';
const api = axios.create({
  baseURL: process.env.YOUVERIFY_BASE_URL || 'https://api.youverify.co',
  headers: {
    'Content-Type': 'application/json',
    token: process.env.YOUVERIFY_SECRET_KEY || '',
  },
});
export async function verifyBVN(bvn) {
  const { data } = await api.post(
    '/identity/api/v2/biometrics/merchant/data/verify',
    { id: bvn, isSubjectConsent: true, type: 'BVN' }
  );
  return data;
}
export async function verifyNIN(nin) {
  const { data } = await api.post(
    '/identity/api/v2/biometrics/merchant/data/verify',
    { id: nin, isSubjectConsent: true, type: 'NIN' }
  );
  return data;
}
export async function faceMatch({ imageA, imageB }) {
  const { data } = await api.post('/identity/api/v2/biometrics/face/compare', {
    imageOne: imageA,
    imageTwo: imageB,
  });
  return data;
}
