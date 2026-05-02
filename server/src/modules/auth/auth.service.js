const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const logger = require('../../config/logger');
const { assertValidAssetThemePresetId } = require('../assets/theme-presets.catalog');
const subscriptionService = require('../subscription/subscription.service');

function toPlainObject(value) {
  if (!value) {
    return value;
  }

  return typeof value.toObject === 'function' ? value.toObject() : value;
}

function normalizeUserSettings(settings) {
  const normalizedSettings = toPlainObject(settings) || {};
  const normalizedPreferences = toPlainObject(normalizedSettings.preferences) || {};
  const normalizedAssetTheme = toPlainObject(normalizedPreferences.assetTheme) || {};

  return {
    ...normalizedSettings,
    preferences: {
      ...normalizedPreferences,
      assetTheme: {
        ...normalizedAssetTheme,
        defaultThemeId:
          normalizedAssetTheme.defaultThemeId === undefined
            ? null
            : normalizedAssetTheme.defaultThemeId,
      },
    },
  };
}

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
        const error = new Error('Sai tài khoản hoặc mật khẩu');
        error.statusCode = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      // Verify password using bcrypt via User model method
      const isValidPassword = await user.comparePassword(password);
      
      if (!isValidPassword) {
        const error = new Error('Sai tài khoản hoặc mật khẩu');
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
      if (error.name === 'JsonWebTokenError') {
        const err = new Error('Invalid refresh token');
        err.statusCode = 401;
        err.code = 'INVALID_TOKEN';
        throw err;
      }
      throw error;
    }
  }

  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return this.toPublicUser(user);
  }

  async patchMe(userId, updates) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const defaultThemeId =
      updates?.settings?.preferences?.assetTheme?.defaultThemeId;

    if (
      updates?.settings?.preferences?.assetTheme
      && Object.prototype.hasOwnProperty.call(
        updates.settings.preferences.assetTheme,
        'defaultThemeId'
      )
    ) {
      const validatedThemeId = assertValidAssetThemePresetId(
        defaultThemeId,
        'settings.preferences.assetTheme.defaultThemeId'
      );

      if (validatedThemeId !== user.settings?.preferences?.assetTheme?.defaultThemeId) {
        await subscriptionService.assertThemeSelectionAllowed(userId, validatedThemeId);
      }

      user.settings = user.settings || {};
      user.settings.preferences = user.settings.preferences || {};
      user.settings.preferences.assetTheme = {
        ...(user.settings.preferences.assetTheme?.toObject
          ? user.settings.preferences.assetTheme.toObject()
          : user.settings.preferences.assetTheme || {}),
        defaultThemeId: validatedThemeId,
      };
    }

    await user.save();
    return this.toPublicUser(user);
  }

  /**
   * Generate JWT access token without expiration
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
        email: user.email,
        role: user.role || 'user',
      },
      jwtSecret
    );
  }

  /**
   * Generate JWT refresh token without expiration
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
        email: user.email,
        role: user.role || 'user',
      },
      jwtRefreshSecret
    );
  }

  /**
   * Convert user to public representation (no sensitive fields)
   * @param {object} user
   * @returns {object}
   */
  toPublicUser(user) {
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role || 'user',
      profile: user.profile,
      gamification: user.gamification,
      settings: normalizeUserSettings(user.settings),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

module.exports = new AuthService();
