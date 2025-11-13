/** @swagger * tags: [{ name: Wallets }]*/
import { Router } from 'express';
import auth from '../middlewares/auth.js';
import * as C from '../controllers/walletController.js';
const r = Router();
r.get('/', auth, C.list);
r.post('/ensure', auth, C.ensure);
r.get('/transactions', auth, C.transactions);
export default r;
