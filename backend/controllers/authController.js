const jwt = require('jsonwebtoken');
const User = require('../models/User');

const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '2h';

function issueToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

/**
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'username and password (min 8 chars) are required',
    });
  }

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Username already taken' });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ username, passwordHash });

  res.status(201).json({
    success: true,
    data: { token: issueToken(user), user: { id: user._id, username: user.username, role: user.role } },
  });
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'username and password are required' });
  }

  const user = await User.findOne({ username });
  // Constant-shape response whether user exists or not, to avoid username enumeration
  const valid = user ? await user.verifyPassword(password) : false;

  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  res.json({
    success: true,
    data: { token: issueToken(user), user: { id: user._id, username: user.username, role: user.role } },
  });
};

/**
 * GET /api/auth/me
 */
exports.me = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};
