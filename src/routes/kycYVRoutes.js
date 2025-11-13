/** @swagger * tags: [{ name: KYC (Youverify) }]*/
import { Router } from 'express';
import auth from '../middlewares/auth.js';
import * as C from '../controllers/kycYVController.js';
const r = Router();
r.post('/yv/bvn', auth, C.startBVN);
r.post('/yv/nin', auth, C.startNIN);
r.post('/yv/face', auth, C.faceMatch);
r.post('/yv/decision', auth, C.approveOnPass);
export default r;
