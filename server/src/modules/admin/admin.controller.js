const adminService = require('./admin.service');

class AdminController {
  async getOverview(req, res, next) {
    try {
      const data = await adminService.getOverview();
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req, res, next) {
    try {
      const data = await adminService.listUsers({
        email: req.query.email,
        role: req.query.role,
        accountStatus: req.query.accountStatus,
        tier: req.query.tier,
        subscriptionStatus: req.query.subscriptionStatus,
        page: req.query.page,
        limit: req.query.limit,
      });
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async getUserSummary(req, res, next) {
    try {
      const data = await adminService.getUserSummary(req.params.userId);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async getOperationsQueueStatus(req, res, next) {
    try {
      const data = await adminService.getOperationsQueueStatus();
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async listFailedJobs(req, res, next) {
    try {
      const data = await adminService.listFailedJobs(req.query.limit);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
module.exports.AdminController = AdminController;
