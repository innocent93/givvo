// services/custodyProvider.js
import dotenv from 'dotenv';
dotenv.config();

import * as bitgoService from './custodyproviders/bitgoService.js';
// import * as bitcodeService from './custodyProviders/bitcodeService.js'; // future

const provider = process.env.CUSTODY_PROVIDER?.toLowerCase();

const custody = {
  async createWallet(userId, currency) {
    if (provider === 'bitgo')
      return bitgoService.createWallet(userId, currency);
    // if (provider === 'bitcode') return bitcodeService.createWallet(userId, currency);
    return null;
  },

  async getDepositAddress(userId, currency) {
    if (provider === 'bitgo')
      return bitgoService.getDepositAddress(userId, currency);
    // if (provider === 'bitcode') return bitcodeService.getDepositAddress(userId, currency);
    return null;
  },

  async withdraw(userId, currency, amount, address) {
    if (provider === 'bitgo')
      return bitgoService.withdraw(userId, currency, amount, address);
    // if (provider === 'bitcode') return bitcodeService.withdraw(userId, currency, amount, address);
    return null;
  },
};

export default custody;
