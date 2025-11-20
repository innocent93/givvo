import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from '../controllers/notificationController.js';
import protectRoute from '#src/middlewares/protectRoute.js';

const router = express.Router();

router.get('/', protectRoute, getNotifications);
router.post('/:id/read', protectRoute, markAsRead);
router.post('/read-all', protectRoute, markAllAsRead);
router.delete('/:id', protectRoute, deleteNotification);
router.get('/unread-count', protectRoute, getUnreadCount);

export default router;
