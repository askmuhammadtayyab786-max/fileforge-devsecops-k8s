const jwt = require('jsonwebtoken');

/**
 * Fixes: "No authentication/authorization on any API endpoint" (Elevation of Privilege)
 *        "No user authentication" (Spoofing)
 *
 * Requires a valid Bearer JWT on every protected request and attaches
 * { id, username, role } to req.user.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch (err) {
    console.warn('JWT verification failed:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };