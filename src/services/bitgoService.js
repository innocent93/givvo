// @ts-nocheck
// add to existing BitgoService class (continuation)
  /**
   * Reserve a deposit address on a given wallet and tag metadata
   * returns { address, raw }
   */
  async reserveDepositAddress({ coin, walletId, label = 'escrow-deposit' }) {
    // use createAddress helper
    const res = await this.createAddress({ coin, walletId, label });
    const address = res.address || res.addresses?.[0];
    return { address, raw: res };
  }

  /**
   * Build and send coins from a wallet (escrow release or refund)
   * recipients: [{ address, amount }]
   * amount units must be in coin-specific units (satoshi/wei)
   */
  async sendFromWallet({ coin, walletId, recipients, walletPassphrase }) {
    const wallet = await this.getWallet({ coin, walletId });
    // Depending on SDK version you may need to build and then sign/send; use send convenience if available
    // Always check SDK docs to ensure correct params (fee, lowPriority, etc).
    const sendParams = { recipients };
    if (walletPassphrase) sendParams.walletPassphrase = walletPassphrase; // if needed
    const res = await wallet.send(sendParams);
    return res;
  }
