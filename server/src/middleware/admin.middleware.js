const User = require('../models/User');

async function requireAdmin(req, res, next) {
  try {
    if (req.user?.role === 'admin') {
      return next();
    }

    const user = req.user?.id ? await User.findById(req.user.id).select('role').lean() : null;

    if (user?.role === 'admin') {
      req.user.role = 'admin';
      return next();
    }

    const error = new Error('Admin access is required');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    return next(error);
  } catch (error) {
    error.statusCode = error.statusCode || 500;
    error.code = error.code || 'AUTHORIZATION_ERROR';
    return next(error);
  }
}

module.exports = requireAdmin;
