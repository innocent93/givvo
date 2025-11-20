import express from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  initiateWithdrawal,
  getTransactionHistory,
  getWalletBalance,
} from '../controllers/paymentController.js';
import protectRoute from '#src/middlewares/protectRoute.js';

const router = express.Router();

router.post('/create-intent', protectRoute, createPaymentIntent);
router.post('/confirm', protectRoute, confirmPayment);
router.post('/withdraw', protectRoute, initiateWithdrawal);
router.get('/history', protectRoute, getTransactionHistory);
router.get('/balance', protectRoute, getWalletBalance);

export default router;
