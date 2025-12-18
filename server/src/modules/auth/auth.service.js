const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const logger = require('../../config/logger');

/**
 * Auth Service
 * Handles user authentication logic
 */
class AuthService {
  /**
   * Register a new user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user: object, accessToken: string, refreshToken: string}>}
   */
  async register(email, password) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        const error = new Error('Email already in use');
        error.statusCode = 409;
        error.code = 'EMAIL_EXISTS';
        throw error;
      }

      // Extract display name from email (part before @)
      const displayName = email.split('@')[0];

      // Create user with default gamification values
      // Note: passwordHash will be hashed by the User model's pre-save hook
      const user = await User.create({
        email: email.toLowerCase(),
        passwordHash: password,
        profile: {
          displayName: displayName
        },
        gamification: {
          totalXp: 0,
          rank: 'Bronze',
          totalNetWorth: 0,
          maintenanceStreak: 0
        },
        settings: {
          notifications: {
            pushEnabled: true,
            maintenanceReminders: true
          }
        }
      });

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      logger.info('User registered successfully', {
        userId: user._id,
        email: user.email
      });

      return {
        user: this.toPublicUser(user),
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Registration error', { error: error.message });
      throw error;
    }
  }

  /**
   * Login existing user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user: object, accessToken: string, refreshToken: string}>}
   */
  async login(email, password) {
    try {
      // Find user with password hash
      const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
      
      if (!user) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      // Verify password using bcrypt via User model method
      const isValidPassword = await user.comparePassword(password);
      
      if (!isValidPassword) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      logger.info('User logged in successfully', {
        userId: user._id,
        email: user.email
      });

      return {
        user: this.toPublicUser(user),
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Login error', { error: error.message });
      throw error;
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken
   * @returns {Promise<{accessToken: string}>}
   */
  async refreshToken(refreshToken) {
    try {
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      if (!jwtRefreshSecret) {
        throw new Error('JWT_REFRESH_SECRET not configured');
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, jwtRefreshSecret);

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 401;
        error.code = 'INVALID_TOKEN';
        throw error;
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      logger.info('Access token refreshed', { userId: user._id });

      return { accessToken };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const err = new Error('Refresh token expired');
        err.statusCode = 401;
        err.code = 'TOKEN_EXPIRED';
        throw err;
      }
      if (error.name === 'JsonWebTokenError') {
        const err = new Error('Invalid refresh token');
        err.statusCode = 401;
        err.code = 'INVALID_TOKEN';
        throw err;
      }
      throw error;
    }
  }

  /**
   * Generate JWT access token (15 minutes)
   * @param {object} user
   * @returns {string}
   */
  generateAccessToken(user) {
    const jwtSecret = process.env.JWT_ACCESS_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_ACCESS_SECRET not configured');
    }

    return jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email
      },
      jwtSecret,
      { expiresIn: '15m' }
    );
  }

  /**
   * Generate JWT refresh token (7 days)
   * @param {object} user
   * @returns {string}
   */
  generateRefreshToken(user) {
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET not configured');
    }

    return jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email
      },
      jwtRefreshSecret,
      { expiresIn: '7d' }
    );
  }

  /**
   * Convert user to public representation (no sensitive fields)
   * @param {object} user
   * @returns {object}
   */
  toPublicUser(user) {
    return {
      id: user._id,
      email: user.email,
      gamification: user.gamification,
      settings: user.settings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

module.exports = new AuthService();
