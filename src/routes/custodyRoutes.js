/** @swagger * tags: [{ name: Custody }]*/
import { Router } from 'express';
import auth from '../middlewares/auth.js';
import * as C from '../controllers/custodyController.js';
const r = Router();
r.post('/wallets', auth, C.createWallet);
r.post('/wallets/:walletId/address', auth, C.newAddress);
r.get('/wallets/:walletId/balance', auth, C.balance);
r.post('/wallets/:walletId/send', auth, C.send);
r.post('/webhooks/bitcode', C.webhook);
export default r;
