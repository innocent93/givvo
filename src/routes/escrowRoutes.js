import express from 'express';
import * as escrowCtrl from '../controllers/escrowControllers.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js'; // assume you have auth middleware

const router = express.Router();

router.post('/', requireAuth, escrowCtrl.createEscrow); // create escrow (buyer)
router.get('/:id', requireAuth, escrowCtrl.getEscrow); // view escrow
router.post('/:id/release', requireAuth, escrowCtrl.releaseEscrow); // release to seller (permissions applied in controller)
router.post('/:id/cancel', requireAuth, escrowCtrl.cancelEscrow); // cancel before funded
router.post('/:id/dispute', requireAuth, escrowCtrl.openDispute); // open dispute
router.post('/:id/refund', requireAuth, escrowCtrl.refundEscrow); // refund (admin or policy-based)

export default router;
