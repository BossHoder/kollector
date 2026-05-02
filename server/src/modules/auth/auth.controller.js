const authService = require('./auth.service');
const logger = require('../../config/logger');

/**
 * Auth Controller
 * Handles HTTP requests for authentication
 */
class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await authService.register(email, password);

      logger.info('Registration successful', {
        requestId: req.id,
        userId: result.user.id
      });

      // Return access token in body, refresh token handling depends on platform
      const platform = req.headers['x-client-platform'] || 'web';
      
      if (platform === 'mobile') {
        // Mobile: return refresh token in body
        res.status(201).json({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        });
      } else {
        // Web: set refresh token as HTTP-only cookie
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        res.status(201).json({
          user: result.user,
          accessToken: result.accessToken
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login existing user
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      logger.info('Login successful', {
        requestId: req.id,
        userId: result.user.id
      });

      // Return tokens based on platform
      const platform = req.headers['x-client-platform'] || 'web';
      
      if (platform === 'mobile') {
        // Mobile: return refresh token in body
        res.status(200).json({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        });
      } else {
        // Web: set refresh token as HTTP-only cookie
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        res.status(200).json({
          user: result.user,
          accessToken: result.accessToken
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      const platform = req.headers['x-client-platform'] || 'web';
      
      let refreshToken;
      if (platform === 'mobile') {
        // Mobile: get refresh token from request body
        refreshToken = req.body.refreshToken;
      } else {
        // Web: get refresh token from cookie
        refreshToken = req.cookies.refreshToken;
      }

      if (!refreshToken) {
        const error = new Error('No refresh token provided');
        error.statusCode = 401;
        error.code = 'NO_REFRESH_TOKEN';
        throw error;
      }

      const result = await authService.refreshToken(refreshToken);

      logger.info('Token refreshed', {
        requestId: req.id
      });

      res.status(200).json({
        accessToken: result.accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);

      logger.info('Profile retrieved', {
        requestId: req.id,
        userId: req.user.id,
      });

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async patchMe(req, res, next) {
    try {
      const user = await authService.patchMe(req.user.id, req.body);

      logger.info('Profile updated', {
        requestId: req.id,
        userId: req.user.id,
      });

      res.status(200).json(user);
    } catch (error) {
      if (error.code === 'INVALID_THEME_PRESET') {
        return res.status(400).json({
          success: false,
          error: {
            code: error.code,
            field: error.field,
            message: error.message,
          },
        });
      }
      if (error.code === 'THEME_TIER_LOCKED') {
        return res.status(403).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details || {},
          },
        });
      }

      next(error);
    }
  }
}

module.exports = new AuthController();
