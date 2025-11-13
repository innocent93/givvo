// @ts-nocheck
// config/arcjet.js
import arcjet, { shield, detectBot, tokenBucket } from '@arcjet/node';
import { ARCJET_KEY } from '../config/env.js';

// Configure Arcjet with security rules.
const aj = arcjet({
  key: ARCJET_KEY,
  characteristics: ['ip.src'], //track request by IP
  rules: [
    //Shield protects your app from common attacks e.g SQL injection
    shield({ mode: 'LIVE' }), // Protects against common attacks
    detectBot({ mode: 'LIVE', allow: ['CATEGORY:SEARCH_ENGINE'] }), // Bot detection
    tokenBucket({ mode: 'LIVE', refillRate: 5, interval: 10, capacity: 10 }), // Rate limiting
  ],
});

// Global Arcjet middleware applied to every incoming request.
const arcjetMiddleware = async (req, res, next) => {
  try {
    const decision = await aj.protect(req, { requested: 1 });
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({ error: 'Too Many Requests' });
      }
      if (decision.reason.isBot()) {
        return res.status(403).json({ error: 'Forbidden: Bot detected' });
      }
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (error) {
    console.error('Arcjet middleware error:', error);
    next();
  }
};

// Middleware for basic email validation on signup.
const validateEmail = async (req, res, next) => {
  try {
    const email = req.body.email;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    // Basic regex for email validation.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    next();
  } catch (error) {
    console.error('Email validation error:', error);
    next();
  }
};

export { aj, arcjetMiddleware, validateEmail };
