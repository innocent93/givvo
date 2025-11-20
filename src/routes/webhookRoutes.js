import express from 'express';
import { bitgoWebhook } from '../controllers/webhookController.js';
const router = express.Router();
router.post('/bitgo', bitgoWebhook);
export default router;
