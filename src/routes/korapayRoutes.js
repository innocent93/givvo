/** @swagger * tags: [{ name: Payments (Korapay) }]*/
import { Router } from 'express';
import auth from '../middlewares/auth.js';
import * as C from '../controllers/korapayController.js';
const r = Router();
r.post('/init', auth, C.init);
r.post('/webhook', C.webhook);
export default r;
