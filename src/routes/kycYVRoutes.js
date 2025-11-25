// @ts-nocheck
import express from 'express';
import protectRoute from '../middlewares/protectRoute.js';
import {
  startBVN,
  startNIN,
  faceMatch,
  approveOnPass,
} from '../controllers/youVerifyKycController.js';

const router = express.Router();

// All require the user to be logged in
router.post('/bvn', protectRoute, startBVN);
router.post('/nin', protectRoute, startNIN);
router.post('/face-match', protectRoute, faceMatch);
router.post('/approve', protectRoute, approveOnPass);

export default router;

// /** @swagger * tags: [{ name: KYC (Youverify) }]*/
// import { Router } from 'express';
// import auth from '../middlewares/auth.js';
// import * as C from '../controllers/kycYVController.js';
// const r = Router();
// r.post('/yv/bvn', auth, C.startBVN);
// r.post('/yv/nin', auth, C.startNIN);
// r.post('/yv/face', auth, C.faceMatch);
// r.post('/yv/decision', auth, C.approveOnPass);
// export default r;
