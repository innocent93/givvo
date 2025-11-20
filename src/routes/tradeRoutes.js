import express from 'express';
import {
  createOffer,
  getOffers,
  acceptOffer,
  getTradeDetail,
  updateTradeStatus,
  cancelTrade,
  submitRating,
  getMyTrades,
} from '../controllers/tradeController.js';
import protectRoute from '#src/middlewares/protectRoute.js';

const router = express.Router();

router.post('/create-offer', protectRoute, createOffer);
router.get('/offers', getOffers);
router.post('/accept-offer', protectRoute, acceptOffer);
router.get('/:id', protectRoute, getTradeDetail);
router.put('/:id/status', protectRoute, updateTradeStatus);
router.delete('/:id', protectRoute, cancelTrade);
router.post('/:id/rating', protectRoute, submitRating);
router.get('/my-trades', protectRoute, getMyTrades);

export default router;
