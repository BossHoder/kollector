const express = require('express');
const { param, query } = require('express-validator');
const authenticate = require('../../middleware/auth.middleware');
const requireAdmin = require('../../middleware/admin.middleware');
const validate = require('../../middleware/validate.middleware');
const adminController = require('./admin.controller');

const adminRouter = express.Router();

adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

adminRouter.get('/overview', adminController.getOverview.bind(adminController));

adminRouter.get(
  '/users',
  query('email')
    .optional()
    .trim(),
  query('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('role phải là user hoặc admin'),
  query('accountStatus')
    .optional()
    .isIn(['active', 'suspended', 'deleted'])
    .withMessage('accountStatus không hợp lệ'),
  query('tier')
    .optional()
    .isIn(['free', 'vip', 'none'])
    .withMessage('tier không hợp lệ'),
  query('subscriptionStatus')
    .optional()
    .isIn(['active', 'grace_pending_renewal', 'expired', 'none'])
    .withMessage('subscriptionStatus không hợp lệ'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page phải lớn hơn hoặc bằng 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit phải nằm trong khoảng từ 1 đến 100'),
  validate,
  adminController.listUsers.bind(adminController)
);

adminRouter.get(
  '/users/:userId',
  param('userId').isMongoId().withMessage('userId không hợp lệ'),
  validate,
  adminController.getUserSummary.bind(adminController)
);

adminRouter.get(
  '/operations/queue-status',
  adminController.getOperationsQueueStatus.bind(adminController)
);

adminRouter.get(
  '/operations/failed-jobs',
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit phải nằm trong khoảng từ 1 đến 100'),
  validate,
  adminController.listFailedJobs.bind(adminController)
);

module.exports = {
  adminRouter,
};
