/** @swagger * tags: [{ name: Marketplace }]*/
import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { uploadDocument } from '../middlewares/upload.js';
import * as C from '../controllers/marketController.js';
const r = Router();
r.get('/cards', C.browse);
r.post('/cards', auth, uploadDocument.array('images', 5), C.create);
r.post('/cards/:id/buy', auth, C.buy);
r.post('/escrows/:id/release', auth, C.release);
export default r;
