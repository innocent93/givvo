import express from 'express';
import * as escrowCtrl from '../controllers/escrowControllers.js';
import protectRoute from '#src/middlewares/protectRoute.js';
import { protectAdmin, authorizeRoles } from '#src/middlewares/adminAuth.js';
const router = express.Router();

router.post('/', protectRoute, escrowCtrl.createEscrow); // create escrow (buyer)
router.get('/:id', protectRoute, escrowCtrl.getEscrow); // view escrow
router.post('/:id/release', protectRoute, escrowCtrl.releaseEscrow); // release to seller (permissions applied in controller)
router.post('/:id/cancel', protectRoute, escrowCtrl.cancelEscrow); // cancel before funded
router.post('/:id/dispute', protectRoute, escrowCtrl.openDispute); // open dispute
router.post('/:id/refund',  protectAdmin, authorizeRoles('superadmin', 'admin'), escrowCtrl.refundEscrow); // refund (admin or policy-based)

export default router;
