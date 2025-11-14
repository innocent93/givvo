// @ts-nocheck
import express from 'express';
import {
  getUserById,
  updateUserDetails,
  updateUserPhoto,
} from '#controllers/profileController.js';
import protectRoute from '#middlewares/protectRoute.js';
import {uploadProfilePhoto } from '../middlewares/upload.js';

const router = express.Router();

// Route to get a user profile by user ID
router.get('/:userId', protectRoute, getUserById);
router.put(
  '/:',
  protectRoute,
  uploadProfilePhoto.single('profilePic'),
  updateUserPhoto
);
router.patch('/:', protectRoute, updateUserDetails);

export default router;
