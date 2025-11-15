// @ts-nocheck
import express from 'express';
import {
  getAdminById,
  updateAdminDetails,
  updateAdminPhoto,
} from '#controllers/adminProfileController.js';

import { uploadProfilePhoto } from '../middlewares/upload.js';
import { protectAdmin } from '#middlewares/adminAuth.js';
const router = express.Router();

// Route to get a Admin profile by Admin ID
router.get('/:adminId', protectAdmin, getAdminById);
router.patch(
  '/:adminId/profile-photo',
  protectAdmin,
  uploadProfilePhoto.single('profilePic'),
  updateAdminPhoto
);
router.put('/:adminId', protectAdmin, updateAdminDetails);

export default router;
