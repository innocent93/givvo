// import { ethers } from 'ethers';

// export const toSatoshi = btcDecimalStr => {
//   // use BigInt to be safe
//   const parts = btcDecimalStr.split('.');
//   const whole = BigInt(parts[0] || '0');
//   const fraction = parts[1] || '';
//   const padded = (fraction + '0'.repeat(8)).slice(0, 8);
//   return (whole * 100_000_000n + BigInt(padded)).toString(); // satoshis as string
// };

// export const toWei = ethDecimalStr => {
//   return ethers.utils.parseEther(ethDecimalStr).toString(); // wei as string
// };

import Big from 'big.js';

export const toSatoshi = btcDecimalStr => {
  // `btcDecimalStr` like '0.00123456'
  const sat = Big(btcDecimalStr).times(100000000);
  return sat.round(0, 0).toFixed(0); // integer string
};

export const toWei = (ethDecimalStr, ethersLib) => {
  // If you want precise ETH conversion, prefer ethers.js on server.
  if (!ethersLib) throw new Error('provide ethers.js');
  return ethersLib.utils.parseEther(ethDecimalStr).toString(); // returns string wei
};

export const addStrings = (a, b) => {
  return Big(a || '0')
    .plus(Big(b || '0'))
    .toFixed(0);
};
// export const subtractStrings = (a, b) => {
//   return Big(a || '0')
//     .minus(Big(b || '0'))
//     .toFixed(0);
// };
// export const multiplyStrings = (a, b) => {
//   return Big(a || '0')
//     .times(Big(b || '0'))
//     .toFixed(0);
// };
// export const divideStrings = (a, b) => {
//   return Big(a || '0')
//     .div(Big(b || '1'))
//     .toFixed(0);
// };
// export const compareStrings = (a, b) => {
//   return Big(a || '0').cmp(Big(b || '0'));
// };
// export const minString = (a, b) => {
//   return Big(a || '0').lt(Big(b || '0')) ? a : b;
// };
// export const maxString = (a, b) => {
//   return Big(a || '0').gt(Big(b || '0')) ? a : b;
// };
// export const formatDecimalString = (valueStr, decimalPlaces) => {
//   const factor = Big(10).pow(decimalPlaces);
//   return Big(valueStr || '0').div(factor).toFixed(decimalPlaces);
// };

// // Example: formatDecimalString('123456789', 8) => '1.23456789'
// export const parseDecimalString = (decimalStr, decimalPlaces) => {
//   const factor = Big(10).pow(decimalPlaces);
//   return Big(decimalStr || '0').times(factor).toFixed(0);
// };

// // Example: parseDecimalString('1.23456789', 8) => '123456789'
// export const isZeroString = valueStr => {
//   return Big(valueStr || '0').eq(0);
// };
// export const isPositiveString = valueStr => {
//   return Big(valueStr || '0').gt(0);
// };
// export const isNegativeString = valueStr => {
//   return Big(valueStr || '0').lt(0);
// };
// export const stringToDecimal = (valueStr, decimalPlaces) => {
//   const factor = Big(10).pow(decimalPlaces);
//   return Big(valueStr || '0').div(factor);
// };
// // Example: stringToDecimal('123456789', 8) => Big { 1.23456789 }
// export const decimalToString = (decimalValue, decimalPlaces) => {
//   const factor = Big(10).pow(decimalPlaces);
//   return Big(decimalValue || 0).times(factor).toFixed(0);
// };
// // Example: decimalToString(Big { 1.23456789 }, 8) => '123456789'
// export const roundString = (valueStr, decimalPlaces) => {
//   return Big(valueStr || '0').round(decimalPlaces, 0).toFixed(decimalPlaces);
// };
// // Example: roundString('1.23456789', 4) => '1.2345'
// export const ceilString = (valueStr, decimalPlaces) => {
//   return Big(valueStr || '0').round(decimalPlaces, 3).toFixed(decimalPlaces);
// };
// // Example: ceilString('1.23456123', 4) => '1.2346'
// export const floorString = (valueStr, decimalPlaces) => {
//   return Big(valueStr || '0').round(decimalPlaces, 1).toFixed(decimalPlaces);
// };
// // Example: floorString('1.23456789', 4) => '1.2345'
// export const percentString = (partStr, totalStr, decimalPlaces) => {
//   if (Big(totalStr || '0').eq(0)) return '0';
//   const percent = Big(partStr || '0')
//     .div(Big(totalStr || '0'))
//     .times(100);
//   return percent.toFixed(decimalPlaces);
// };
// // Example: percentString('25', '200', 2) => '12.50'

// export const averageString = (totalStr, countStr) => {
//   if (Big(countStr || '0').eq(0)) return '0';
//   return Big(totalStr || '0')
//     .div(Big(countStr || '0'))
//     .toFixed(0);
// };
// // Example: averageString('1000', '3') => '333'.333.. but returns '333'
// export const sqrtString = valueStr => {
//   return Big(valueStr || '0').sqrt().toFixed(0);
// };
