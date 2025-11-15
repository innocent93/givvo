// @ts-nocheck
import express from 'express';
import {
  getUserById,
  updateUserDetails,
  updateUserPhoto,
} from '#controllers/profileController.js';
import protectRoute from '#middlewares/protectRoute.js';
import { uploadProfilePhoto } from '../middlewares/upload.js';

const router = express.Router();

// Route to get a user profile by user ID
router.get('/:userId', protectRoute, getUserById);
router.patch(
  '/:userId/profile-photo',
  protectRoute,
  uploadProfilePhoto.single('profilePic'),
  updateUserPhoto
);
router.put('/:userId', protectRoute, updateUserDetails);

export default router;
