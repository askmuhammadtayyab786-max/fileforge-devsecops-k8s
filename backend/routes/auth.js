const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { register, login, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Slow brute-force / credential-stuffing attempts against login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, asyncHandler(register));
router.post('/login', authLimiter, asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));

module.exports = router;
