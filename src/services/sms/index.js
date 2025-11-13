import * as termii from './providers/termii.js';
import * as vivo from './providers/vivo.js';
const providers = { termii, vivo };
export function getSMS() {
  const name = (process.env.SMS_PROVIDER || 'termii').toLowerCase();
  const p = providers[name];
  if (!p) throw new Error('SMS_PROVIDER_UNSUPPORTED');
  return p;
}
