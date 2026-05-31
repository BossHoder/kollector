const express = require('express');
const { body } = require('express-validator');
const authController = require('./auth.controller');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');

const router = express.Router();

/**
 * Validation rules for registration
 */
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Vui lòng nhập địa chỉ email hợp lệ')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Mật khẩu phải có ít nhất 8 ký tự')
];

/**
 * Validation rules for login
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Vui lòng nhập địa chỉ email hợp lệ')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc')
];

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', registerValidation, validate, authController.register.bind(authController));

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post('/login', loginValidation, validate, authController.login.bind(authController));

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', authController.refreshToken.bind(authController));

router.use(authenticate);

const patchMeValidation = [
  body('settings.preferences.assetTheme.defaultThemeId')
    .optional({ values: 'undefined' })
    .custom((value) => value === null || typeof value === 'string')
    .withMessage('settings.preferences.assetTheme.defaultThemeId phải là chuỗi hoặc null'),
];

router.get('/me', authController.getMe.bind(authController));
router.patch('/me', patchMeValidation, validate, authController.patchMe.bind(authController));

module.exports = router;
