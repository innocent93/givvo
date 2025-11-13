/** @swagger * tags: [{ name: Auth }]*/
import { Router } from 'express';
import * as C from '../controllers/authController.js';
const r = Router();
r.post('/signup', C.signup);
r.post('/verify-email', C.verifyEmail);
r.post('/login', C.login);
r.get('/2fa/setup', C.totpSetup);
r.post('/2fa/enable', C.totpEnable);
export default r;
