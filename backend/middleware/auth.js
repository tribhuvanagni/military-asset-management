const jwt = require('jsonwebtoken');

/**
 * Extracts and validates the JWT from the Authorization header.
 * Attaches decoded payload (userId, role, base) to req.user.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required - no token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired - please log in again' });
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

/**
 * Factory that returns middleware restricting access to specific roles.
 * Usage: requireRole('admin', 'logistics')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied - requires one of: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
