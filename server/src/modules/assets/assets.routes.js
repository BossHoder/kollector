const express = require('express');
const { body, param, query } = require('express-validator');
const assetController = require('./assets.controller');
const authenticate = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { singleImage } = require('../../middleware/upload.middleware');

const router = express.Router();

// All asset routes require authentication
router.use(authenticate);

/**
 * Validation rules for creating an asset
 */
const createAssetValidation = [
  body('category')
    .isIn(['sneaker', 'lego', 'camera', 'other'])
    .withMessage('Category must be one of: sneaker, lego, camera, other'),
  body('status')
    .optional()
    .isIn(['draft', 'processing', 'active', 'archived'])
    .withMessage('Status must be one of: draft, processing, active, archived')
];

/**
 * Validation rules for updating an asset
 */
const updateAssetValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid asset ID'),
  body('category')
    .optional()
    .isIn(['sneaker', 'lego', 'camera', 'other'])
    .withMessage('Category must be one of: sneaker, lego, camera, other'),
  body('status')
    .optional()
    .isIn(['draft', 'processing', 'active', 'archived'])
    .withMessage('Status must be one of: draft, processing, active, archived')
];

/**
 * Validation rules for asset ID parameter
 */
const assetIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid asset ID')
];

/**
 * Validation rules for list query parameters
 */
const listAssetsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('category')
    .optional()
    .isIn(['sneaker', 'lego', 'camera', 'other'])
    .withMessage('Category must be one of: sneaker, lego, camera, other'),
  query('status')
    .optional()
    .isIn(['draft', 'processing', 'active', 'archived'])
    .withMessage('Status must be one of: draft, processing, active, archived')
];

/**
 * GET /api/assets
 * List assets for current user with pagination
 */
router.get('/', listAssetsValidation, validate, assetController.listAssets.bind(assetController));

/**
 * POST /api/assets/analyze-queue
 * Submit asset for AI processing (multipart/form-data)
 * Creates draft asset, uploads to Cloudinary, enqueues AI job
 */
router.post('/analyze-queue', 
  ...singleImage('image'),
  assetController.analyzeQueue.bind(assetController)
);

/**
 * GET /api/assets/queue-status
 * Get queue metrics for monitoring
 */
router.get('/queue-status', assetController.getQueueStatus.bind(assetController));

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

module.exports = router;
