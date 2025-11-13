// @ts-nocheck
import express from 'express';
import { getUserById } from '../controllers/profileController.js';
import protectRoute from '../middleware/authMiddleware.js';

const router = express.Router();

// Route to get a user profile by user ID
router.get('/:userId', protectRoute, getUserById);

export default router;
