const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const { username, password } = req.body;

      const user = await User.findOne({ username: username.toLowerCase() });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials - user not found' });
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid credentials - incorrect password' });
      }

      const tokenPayload = {
        userId: user._id,
        role: user.role,
        base: user.assignedBase
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

      res.json({
        token,
        user: user.toSafeObject()
      });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ error: 'Authentication service unavailable' });
    }
  }
);

// GET /api/auth/me - return current user profile from token
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    console.error('Profile fetch error:', err.message);
    res.status(500).json({ error: 'Could not retrieve user profile' });
  }
});

module.exports = router;
