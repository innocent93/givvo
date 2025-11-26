// @ts-nocheck
import express from 'express';
import multer from 'multer';
import protectRoute from '../middlewares/protectRoute.js';
import {
  submitPersonalKyc,
  getKycStatus,
  submitMerchantKyc,
} from '../controllers/kycController.js';

const router = express.Router();
const upload = multer(); // memory storage for Cloudinary streaming

// PERSONAL KYC
router.post(
  '/personal',
  upload.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'utilityBill', maxCount: 1 },
  ]),
  protectRoute,
  submitPersonalKyc
);

// MERCHANT KYC
router.post(
  '/merchant',
  upload.fields([
    { name: 'cacDocument', maxCount: 1 },
    { name: 'proofOfAddress', maxCount: 1 },
    { name: 'businessVerificationDoc', maxCount: 1 }, // optional
  ]),
  protectRoute,
  submitMerchantKyc
);

// KYC STATUS (personal + merchant)
router.get('/me', protectRoute, getKycStatus);

export default router;
