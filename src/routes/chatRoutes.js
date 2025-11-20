import express from 'express';
import {
  getChat,
  getChatByTrade,
  getMyChats,
  markMessagesAsRead,
} from '../controllers/chatController.js';
import protectRoute from '#src/middlewares/protectRoute.js';

const router = express.Router();

router.get('/:id', protectRoute, getChat);
router.get('/trade/:tradeId', protectRoute, getChatByTrade);
router.get('/', protectRoute, getMyChats);
router.post('/:id/read', protectRoute, markMessagesAsRead);

export default router;
