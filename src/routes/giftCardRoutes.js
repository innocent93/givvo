import express from 'express';
import {
  createListing,
  getListings,
  getListingDetail,
  buyGiftCard,
  cancelListing,
  getMyListings,
  verifyGiftCard,
} from '../controllers/giftCardController.js';
import protectRoute from '#src/middlewares/protectRoute.js';

const router = express.Router();

router.post('/create', protectRoute, createListing);
router.get('/listings', getListings);
router.get('/listings/:id', getListingDetail);
router.post('/buy', protectRoute, buyGiftCard);
router.delete('/:id', protectRoute, cancelListing);
router.get('/my-listings', protectRoute, getMyListings);
router.post('/verify', protectRoute, verifyGiftCard);

export default router;
