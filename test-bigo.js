// test-bitgo.js
import bitgoService from './src/services/bitgoService.js';

(async () => {
  try {
    console.log('bitgo client ready?', !!bitgoService.client);
    // list wallets for a coin (may require proper token & permissions)
    const cc = await bitgoService.coinClient('tbtc');
    const wallets = await cc.wallets().list(); // may require token perms
    console.log('wallets count:', wallets.length || wallets);
  } catch (err) {
    console.error('test error', err);
  }
})();
