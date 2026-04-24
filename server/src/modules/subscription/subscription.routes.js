const express = require('express');
const { body, param, query } = require('express-validator');
const authenticate = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.middleware');
const { singleImage } = require('../../middleware/upload.middleware');
const subscriptionController = require('./subscription.controller');
const {
  SUBSCRIPTION_REQUEST_STATUS,
  SUBSCRIPTION_REQUEST_TYPES,
} = require('./subscription.constants');

const subscriptionRouter = express.Router();
const adminSubscriptionRouter = express.Router();

subscriptionRouter.use(authenticate);
adminSubscriptionRouter.use(authenticate);

const requestIdValidation = [
  param('requestId').isMongoId().withMessage('Invalid requestId'),
];

subscriptionRouter.get('/me', subscriptionController.getMySubscription.bind(subscriptionController));

subscriptionRouter.post(
  '/upgrade-requests',
  ...singleImage('proofFile'),
  body('type')
    .isIn(Object.values(SUBSCRIPTION_REQUEST_TYPES))
    .withMessage(`type must be one of: ${Object.values(SUBSCRIPTION_REQUEST_TYPES).join(', ')}`),
  body('transferReference')
    .trim()
    .notEmpty()
    .withMessage('transferReference is required'),
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
      `status must be one of: ${Object.values(SUBSCRIPTION_REQUEST_STATUS).join(', ')}`
    ),
  validate,
  subscriptionController.adminListUpgradeRequests.bind(subscriptionController)
);

adminSubscriptionRouter.post(
  '/upgrade-requests/:requestId/approve',
  requestIdValidation,
  body('reason').optional().isString().withMessage('reason must be a string'),
  validate,
  subscriptionController.adminApproveUpgradeRequest.bind(subscriptionController)
);

adminSubscriptionRouter.post(
  '/upgrade-requests/:requestId/reject',
  requestIdValidation,
  body('reason').trim().notEmpty().withMessage('reason is required'),
  validate,
  subscriptionController.adminRejectUpgradeRequest.bind(subscriptionController)
);

module.exports = {
  adminSubscriptionRouter,
  subscriptionRouter,
};
