// // src/services/bitgoService.js
// import BitGoJS from 'bitgo';
// import crypto from 'crypto';

// const BITGO_ENV = process.env.BITGO_ENV || 'test';
// const ACCESS_TOKEN =
//   process.env.BITGO_ACCESS_TOKEN ||
//   process.env.BITGO_TOKEN ||
//   process.env.BITGO ||
//   null;

// class BitgoService {
//   constructor() {
//     // ✔ Correct constructor for bitgo@50.x
//     const BitGoCtor = BitGoJS.BitGo || BitGoJS;

//     this.client = new BitGoCtor({ env: BITGO_ENV });

//     // ✔ Correct token setter
//     if (ACCESS_TOKEN && typeof this.client.setAccessToken === 'function') {
//       this.client.setAccessToken(ACCESS_TOKEN);
//     } else {
//       this.client.accessToken = ACCESS_TOKEN;
//     }
//   }

//   // -----------------------------
//   // Standard methods
//   // -----------------------------

//   async coinClient(coin) {
//     if (typeof this.client.coin !== 'function') {
//       throw new Error('Your BitGo version does not support .coin(coin)');
//     }
//     return this.client.coin(coin);
//   }

//   async getWallet({ coin, walletId }) {
//     const coinClient = await this.coinClient(coin);
//     const wallets = coinClient.wallets();
//     return wallets.get({ id: walletId });
//   }

//   async createAddress({ coin, walletId, label = 'deposit' }) {
//     const wallet = await this.getWallet({ coin, walletId });
//     return wallet.createAddress({ label });
//   }

//   async sendFromWallet({ coin, walletId, recipients, walletPassphrase }) {
//     const wallet = await this.getWallet({ coin, walletId });
//     const params = { recipients };
//     if (walletPassphrase) params.walletPassphrase = walletPassphrase;
//     return wallet.send(params);
//   }

//   async generateWallet({ coin, label, passphrase }) {
//     const coinClient = await this.coinClient(coin);
//     return coinClient.wallets().generateWallet({ label, passphrase });
//   }

//   // -----------------------------
//   // Webhook Signature Verification
//   // -----------------------------
//   verifyWebhook({ bodyRaw, headers }) {
//     const secret = process.env.WEBHOOK_SECRET;
//     if (!secret) return false;

//     const signature =
//       headers['x-bitgo-signature'] ||
//       headers['x-signature'] ||
//       headers['x-hub-signature'] ||
//       null;

//     if (!signature) return false;

//     const expected = crypto
//       .createHmac('sha256', secret)
//       .update(bodyRaw)
//       .digest('hex');

//     try {
//       return crypto.timingSafeEqual(
//         Buffer.from(expected),
//         Buffer.from(signature)
//       );
//     } catch {
//       return false;
//     }
//   }
// }

// export default new BitgoService();


// src/services/bitgoService.js
import BitGoJS from 'bitgo';
import crypto from 'crypto';

const BITGO_ENV = process.env.BITGO_ENV || 'test';
const ACCESS_TOKEN =
  process.env.BITGO_ACCESS_TOKEN ||
  process.env.BITGO_TOKEN ||
  process.env.BITGO ||
  null;

class BitgoService {
  constructor() {
    // For bitgo@50.x the constructor is BitGoJS.BitGo
    const BitGoCtor = BitGoJS.BitGo || BitGoJS;
    this.client = new BitGoCtor({ env: BITGO_ENV });

    // set token if available
    if (ACCESS_TOKEN && typeof this.client.setAccessToken === 'function') {
      this.client.setAccessToken(ACCESS_TOKEN);
    } else {
      // fallback property (some shapes use .accessToken)
      this.client.accessToken = ACCESS_TOKEN;
    }
  }

  // Helper to assert client readiness
  _ensureClient() {
    if (!this.client) throw new Error('BitGo client not initialized.');
  }

  // get coin client (e.g. 'tbtc', 'teth', 'tbtc')
  async coinClient(coin = 'tbtc') {
    this._ensureClient();
    if (typeof this.client.coin !== 'function') {
      throw new Error('.coin(coin) is not supported by the current BitGo client');
    }
    return this.client.coin(coin);
  }

  // Returns the BitGo wallet object (SDK-specific)
  async getWallet({ coin = 'tbtc', walletId }) {
    if (!walletId) throw new Error('walletId required');
    const cc = await this.coinClient(coin);
    const wallets = cc.wallets();
    return wallets.get({ id: walletId });
  }

  // Create a new receive address for a wallet
  async createAddress({ coin = 'tbtc', walletId, label = 'deposit' }) {
    if (!walletId) throw new Error('walletId required');
    const wallet = await this.getWallet({ coin, walletId });
    if (!wallet || typeof wallet.createAddress !== 'function') {
      throw new Error('wallet.createAddress is not available on this SDK/wallet object');
    }
    return wallet.createAddress({ label });
  }

  // Send from wallet (convenience wrapper). recipients: [{ address, amount }]
  async sendFromWallet({ coin = 'tbtc', walletId, recipients = [], walletPassphrase }) {
    if (!walletId) throw new Error('walletId required');
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('recipients array required');
    }
    const wallet = await this.getWallet({ coin, walletId });
    if (!wallet) throw new Error('wallet not found');
    if (typeof wallet.send !== 'function') {
      throw new Error('wallet.send not supported by this SDK shape — implement build/sign/send flow as needed');
    }
    const params = { recipients };
    if (walletPassphrase) params.walletPassphrase = walletPassphrase;
    return wallet.send(params);
  }

  // Generate wallet (used for initial platform wallet creation)
  async generateWallet({ coin = 'tbtc', label, passphrase }) {
    const cc = await this.coinClient(coin);
    if (!cc || typeof cc.wallets !== 'function') {
      throw new Error('coinClient.wallets not available for this SDK');
    }
    return cc.wallets().generateWallet({ label, passphrase });
  }

  // Verify webhook signature (HMAC SHA256). Expects raw body string and headers object.
  verifyWebhook({ bodyRaw, headers = {} }) {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) return false;

    const headerSignature =
      headers['x-bitgo-signature'] ||
      headers['x-signature'] ||
      headers['x-hub-signature'] ||
      headers['signature'] ||
      headers.signature ||
      null;

    if (!headerSignature) return false;

    const expected = crypto.createHmac('sha256', secret).update(bodyRaw).digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(headerSignature)));
    } catch (e) {
      return false;
    }
  }
}

// export singleton
export default new BitgoService();
