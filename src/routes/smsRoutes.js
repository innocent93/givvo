/** @swagger * tags: [{ name: Messaging }]*/
import { Router } from 'express';
import auth from '../middlewares/auth.js';
import * as C from '../controllers/smsController.js';
const r = Router();
r.post('/sms/send', auth, C.send);
export default r;
