const express = require('express');
const { body, param, query } = require('express-validator');
const authenticate = require('../../middleware/auth.middleware');
const requireAdmin = require('../../middleware/admin.middleware');
const validate = require('../../middleware/validate.middleware');
const subscriptionController = require('./subscription.controller');
const {
  SUBSCRIPTION_REQUEST_STATUS,
  SUBSCRIPTION_REQUEST_TYPES,
} = require('./subscription.constants');

const subscriptionRouter = express.Router();
const adminSubscriptionRouter = express.Router();

subscriptionRouter.use(authenticate);
adminSubscriptionRouter.use(authenticate);
adminSubscriptionRouter.use(requireAdmin);

const requestIdValidation = [
  param('requestId').isMongoId().withMessage('requestId không hợp lệ'),
];

subscriptionRouter.get('/me', subscriptionController.getMySubscription.bind(subscriptionController));

subscriptionRouter.post(
  '/upgrade-requests',
  body('type')
    .isIn(Object.values(SUBSCRIPTION_REQUEST_TYPES))
    .withMessage(`type phải là một trong: ${Object.values(SUBSCRIPTION_REQUEST_TYPES).join(', ')}`),
  body('transferReference')
    .trim()
    .notEmpty()
    .withMessage('transferReference là bắt buộc'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('amount phải là số không âm'),
  body('currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('currency phải là mã 3 ký tự'),
  body('bankLabel')
    .optional()
    .isString()
    .isLength({ min: 1, max: 120 })
    .withMessage('bankLabel phải là chuỗi hợp lệ'),
  body('payerMask')
    .optional()
    .isString()
    .isLength({ min: 1, max: 20 })
    .withMessage('payerMask phải là chuỗi hợp lệ'),
  body('proofFile')
    .optional({ nullable: true })
    .custom((value) => value === null || typeof value === 'object')
    .withMessage('proofFile must be an object or null'),
  body('proofFile.storageUrl')
    .optional()
    .isString()
    .isLength({ min: 1, max: 2048 })
    .withMessage('proofFile.storageUrl must be a valid string'),
  body('proofFile.uploadedAt')
    .optional()
    .isISO8601()
    .withMessage('proofFile.uploadedAt must be an ISO date'),
  validate,
  subscriptionController.createUpgradeRequest.bind(subscriptionController)
);

subscriptionRouter.get(
  '/upgrade-requests',
  subscriptionController.listOwnUpgradeRequests.bind(subscriptionController)
);

subscriptionRouter.get(
  '/upgrade-requests/:requestId',
  requestIdValidation,
  validate,
  subscriptionController.getOwnUpgradeRequest.bind(subscriptionController)
);

adminSubscriptionRouter.get(
  '/upgrade-requests',
  query('status')
    .optional()
    .isIn(Object.values(SUBSCRIPTION_REQUEST_STATUS))
    .withMessage(
      `status phải là một trong: ${Object.values(SUBSCRIPTION_REQUEST_STATUS).join(', ')}`
    ),
  validate,
  subscriptionController.adminListUpgradeRequests.bind(subscriptionController)
);

adminSubscriptionRouter.post(
  '/upgrade-requests/:requestId/approve',
  requestIdValidation,
  body('reason').optional().isString().withMessage('reason phải là chuỗi'),
  validate,
  subscriptionController.adminApproveUpgradeRequest.bind(subscriptionController)
);

adminSubscriptionRouter.post(
  '/upgrade-requests/:requestId/reject',
  requestIdValidation,
  body('reason').trim().notEmpty().withMessage('reason là bắt buộc'),
  validate,
  subscriptionController.adminRejectUpgradeRequest.bind(subscriptionController)
);

module.exports = {
  adminSubscriptionRouter,
  subscriptionRouter,
};
