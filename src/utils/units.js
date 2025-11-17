import { ethers } from 'ethers';

export const toSatoshi = btcDecimalStr => {
  // use BigInt to be safe
  const parts = btcDecimalStr.split('.');
  const whole = BigInt(parts[0] || '0');
  const fraction = parts[1] || '';
  const padded = (fraction + '0'.repeat(8)).slice(0, 8);
  return (whole * 100_000_000n + BigInt(padded)).toString(); // satoshis as string
};

export const toWei = ethDecimalStr => {
  return ethers.utils.parseEther(ethDecimalStr).toString(); // wei as string
};
