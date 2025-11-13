/** @swagger * tags: [{ name: Users }]*/
import { Router } from 'express';
import auth from '../middlewares/auth.js';
import * as C from '../controllers/userController.js';
const r = Router();
r.get('/me', auth, C.me);
r.patch('/me', auth, C.updateMe);
export default r;
