/** @swagger * tags: [{ name: Prices }]*/
import { Router } from 'express';
import * as C from '../controllers/priceController.js';
const r = Router();
r.get('/tickers', C.tickers);
r.post('/convert', C.convertPrice);
r.get('/quote/offer/:id', C.quoteForOffer);
export default r;
