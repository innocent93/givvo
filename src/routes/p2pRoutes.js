/** @swagger * tags: [{ name: P2P }]*/
import { Router } from 'express';
import auth from '../middlewares/auth.js';
import * as C from '../controllers/p2pController.js';
const r = Router();
r.get('/offers', C.listOffers);
r.post('/offers', auth, C.createOffer);
r.patch('/offers/:id/pause', auth, C.pauseOffer);
r.delete('/offers/:id', auth, C.deleteOffer);
r.post('/offers/:id/trades', auth, C.initiateTrade);
r.post('/trades/:id/mark-paid', auth, C.markPaid);
r.post('/trades/:id/release', auth, C.release);
export default r;
