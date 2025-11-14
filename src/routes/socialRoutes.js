// routes/auth.routes.js
// @ts-nocheck
import express from 'express';
import passport from 'passport';
import { oauthCallbackHandler } from '../controllers/socialController.js';

const router = express.Router();

// GOOGLE
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: true,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/failure',
    session: true,
  }),
  oauthCallbackHandler
);

// FACEBOOK
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'], session: true })
);

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    failureRedirect: '/auth/failure',
    session: true,
  }),
  oauthCallbackHandler
);

router.get('/failure', (req, res) =>
  res.status(401).json({ message: 'OAuth failed' })
);

export default router;
