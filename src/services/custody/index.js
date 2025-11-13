import * as bitcode from './providers/bitcode.js';
const providers = { bitcode };
export function getCustody() {
  const name = (process.env.CUSTODY_PROVIDER || 'bitcode').toLowerCase();
  const p = providers[name];
  if (!p) throw new Error('CUSTODY_PROVIDER_UNSUPPORTED');
  return p;
}
