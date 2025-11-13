/** @swagger * tags: [{ name: KYC }]*/
import { Router } from 'express';
import auth from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';
import * as C from '../controllers/kycController.js';
const r = Router();
r.post(
  '/documents',
  auth,
  upload.fields([
    { name: 'idFront' },
    { name: 'idBack' },
    { name: 'selfie' },
    { name: 'utilityBill' },
  ]),
  C.uploadDocs
);
r.get('/status', auth, C.status);
export default r;
