// @ts-nocheck
import { ethers } from 'ethers';

/**
 * Convert BTC decimal (e.g., "0.00123") to satoshi string
 * BTC uses 1e8 units
 */
export const toSatoshi = btcDecimalStr => {
  if (!btcDecimalStr) return '0';

  // ethers.parseUnits allows ANY decimals
  return ethers.parseUnits(btcDecimalStr, 8).toString();
};

/**
 * Convert ETH decimal (e.g., "0.5") to wei string
 */
export const toWei = ethDecimalStr => {
  if (!ethDecimalStr) return '0';

  return ethers.parseEther(ethDecimalStr).toString();
};

/**
 * Add two big integer strings safely
 */
export const addStrings = (a, b) => {
  const A = a ? BigInt(a) : 0n;
  const B = b ? BigInt(b) : 0n;
  return (A + B).toString();
};

      
