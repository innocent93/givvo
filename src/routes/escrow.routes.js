import express from 'express';
import {
  confirmPayment,
  getEscrowDetail,
  releaseEscrow,
  refundEscrow,
} from '../controllers/escrow.controller.js';
import protectRoute from '#src/middlewares/protectRoute.js';

const router = express.Router();

router.post('/confirm-payment', protectRoute, confirmPayment);
router.get('/:id', protectRoute, getEscrowDetail);
router.post('/:id/release', protectRoute, releaseEscrow);
router.post('/:id/refund', protectRoute, refundEscrow);

export default router;
