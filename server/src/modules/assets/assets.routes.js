const express = require('express');
const { body, param, query } = require('express-validator');
const assetController = require('./assets.controller');
const authenticate = require('../../middleware/auth.middleware');
const requireAdmin = require('../../middleware/admin.middleware');
const validate = require('../../middleware/validate.middleware');
const { singleImage } = require('../../middleware/upload.middleware');
const {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_VALIDATION_MESSAGE,
  normalizeCanonicalAssetCategory,
  normalizeCategoryKey,
} = require('./upload.helpers');

const router = express.Router();

// All asset routes require authentication
router.use(authenticate);

/**
 * Validation rules for creating an asset
 */
const createAssetValidation = [
  body('category')
    .customSanitizer((value) => normalizeCanonicalAssetCategory(value) || normalizeCategoryKey(value) || value)
    .isIn(ASSET_CATEGORIES)
    .withMessage(ASSET_CATEGORY_VALIDATION_MESSAGE),
  body('status')
    .optional()
    .isIn(['draft', 'processing', 'active', 'archived'])
    .withMessage('Tráº¡ng thÃ¡i pháº£i lÃ  má»™t trong: draft, processing, active, archived')
];

/**
 * Validation rules for updating an asset
 */
const updateAssetValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID tÃ i sáº£n khÃ´ng há»£p lá»‡'),
  body('category')
    .optional()
    .customSanitizer((value) => normalizeCanonicalAssetCategory(value) || normalizeCategoryKey(value) || value)
    .isIn(ASSET_CATEGORIES)
    .withMessage(ASSET_CATEGORY_VALIDATION_MESSAGE),
  body('status')
    .optional()
    .isIn(['draft', 'processing', 'active', 'archived'])
    .withMessage('Tráº¡ng thÃ¡i pháº£i lÃ  má»™t trong: draft, processing, active, archived'),
  body('presentation.themeOverrideId')
    .optional({ values: 'undefined' })
    .custom((value) => value === null || typeof value === 'string')
    .withMessage('presentation.themeOverrideId pháº£i lÃ  chuá»—i hoáº·c null')
];

/**
 * Validation rules for asset ID parameter
 */
const assetIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID tÃ i sáº£n khÃ´ng há»£p lá»‡')
];

const maintainAssetValidation = [
  param('assetId')
    .isMongoId()
    .withMessage('ID tÃ i sáº£n khÃ´ng há»£p lá»‡'),
  body('version')
    .isInt({ min: 1 })
    .withMessage('Version pháº£i lÃ  sá»‘ nguyÃªn dÆ°Æ¡ng'),
  body('cleanedPercentage')
    .isFloat({ min: 80, max: 100 })
    .withMessage('cleanedPercentage pháº£i náº±m trong khoáº£ng tá»« 80 Ä‘áº¿n 100'),
  body('durationMs')
    .optional()
    .isInt({ min: 2000 })
    .withMessage('durationMs pháº£i Ã­t nháº¥t lÃ  2000'),
];

/**
 * Validation rules for list query parameters
 */
const listAssetsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Giá»›i háº¡n pháº£i náº±m trong khoáº£ng tá»« 1 Ä‘áº¿n 100'),
  query('category')
    .optional()
    .customSanitizer((value) => normalizeCategoryKey(value) || value)
    .isIn(ASSET_CATEGORIES)
    .withMessage(`Category query must be one of: ${ASSET_CATEGORIES.join(', ')}`),
  query('status')
    .optional()
    .isIn(['draft', 'processing', 'partial', 'active', 'archived', 'failed'])
    .withMessage('Tráº¡ng thÃ¡i pháº£i lÃ  má»™t trong: draft, processing, partial, active, archived, failed')
];

/**
 * GET /api/assets
 * List assets for current user with pagination
 */
router.get('/', listAssetsValidation, validate, assetController.listAssets.bind(assetController));

router.get('/categories', assetController.getCategories.bind(assetController));

/**
 * POST /api/assets/analyze-queue
 * Submit asset for AI processing (multipart/form-data)
 * Creates draft asset, uploads to configured storage, enqueues AI job
 */
router.post(
  '/analyze-queue',
  ...singleImage('image'),
  assetController.analyzeQueue.bind(assetController)
);

/**
 * GET /api/assets/queue-status
 * Get queue metrics for monitoring
 */
router.get('/queue-status', requireAdmin, assetController.getQueueStatus.bind(assetController));

/**
 * POST /api/assets/:id/enhance-image
 * Queue manual image enhancement for an asset
 */
router.post(
  '/:id/enhance-image',
  assetIdValidation,
  validate,
  assetController.queueEnhancement.bind(assetController)
);

/**
 * POST /api/assets
 * Create a new asset
 */
router.post('/', createAssetValidation, validate, assetController.createAsset.bind(assetController));

/**
 * GET /api/assets/:id
 * Get asset by ID
 */
router.get('/:id', assetIdValidation, validate, assetController.getAssetById.bind(assetController));

/**
 * PATCH /api/assets/:id
 * Update an asset
 */
router.patch('/:id', updateAssetValidation, validate, assetController.updateAsset.bind(assetController));

/**
 * DELETE /api/assets/:id
 * Delete an asset
 */
router.delete('/:id', assetIdValidation, validate, assetController.deleteAsset.bind(assetController));

/**
 * POST /api/assets/:assetId/maintain
 * Submit an asset maintenance action
 */
router.post('/:assetId/maintain', maintainAssetValidation, validate, assetController.maintainAsset.bind(assetController));

/**
 * POST /api/assets/:id/retry
 * Retry failed/partial asset analysis
 * Only valid for status: failed, partial
 */
router.post('/:id/retry', assetIdValidation, validate, assetController.retryAsset.bind(assetController));

module.exports = router;
