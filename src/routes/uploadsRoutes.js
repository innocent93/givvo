/** @swagger * tags: [{ name: Uploads }]*/
import { Router } from 'express';
import auth from '../middlewares/auth.js';
import * as C from '../controllers/uploadsController.js';
const r = Router();
r.post('/presign', auth, C.presign);
export default r;
