import express from 'express';
import {
  createDispute,
  getDispute,
  submitEvidence,
  resolveDispute,
  getMyDisputes,
  getAllDisputes,
} from '../controllers/disputeController.js';
import protectRoute from '#src/middlewares/protectRoute.js';
import { protectAdmin } from '#src/middlewares/adminAuth.js';

const router = express.Router();

router.post('/create', protectRoute, createDispute);
router.get('/:id', protectRoute, getDispute);
router.post('/:id/evidence', protectRoute, submitEvidence);
router.post('/:id/resolve', protectAdmin, resolveDispute);
router.get('/my-disputes', protectRoute, getMyDisputes);
router.get('/admin/all', protectAdmin, getAllDisputes);

export default router;
