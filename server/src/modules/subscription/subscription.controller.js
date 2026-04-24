const subscriptionService = require('./subscription.service');

function buildProofMetadataFromUpload(file) {
  if (!file) {
    return null;
  }

  return {
    storageUrl: file.path || file.filename || file.originalname || `memory://${Date.now()}`,
    uploadedAt: new Date(),
  };
}

class SubscriptionController {
  async getMySubscription(req, res, next) {
    try {
      const data = await subscriptionService.getSubscriptionStatus(req.user.id);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async createUpgradeRequest(req, res, next) {
    try {
      const data = await subscriptionService.createUpgradeRequest(req.user.id, {
        type: req.body.type,
        transferReference: req.body.transferReference,
        amount: req.body.amount ? Number(req.body.amount) : undefined,
        currency: req.body.currency,
        bankLabel: req.body.bankLabel,
        payerMask: req.body.payerMask,
        proofFile: buildProofMetadataFromUpload(req.file),
      });

      res.status(202).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async listOwnUpgradeRequests(req, res, next) {
    try {
      const data = await subscriptionService.listOwnUpgradeRequests(req.user.id);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async getOwnUpgradeRequest(req, res, next) {
    try {
      const data = await subscriptionService.getOwnUpgradeRequest(req.user.id, req.params.requestId);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async adminListUpgradeRequests(req, res, next) {
    try {
      const data = await subscriptionService.adminListUpgradeRequests({
        status: req.query.status,
      });

      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async adminApproveUpgradeRequest(req, res, next) {
    try {
      const data = await subscriptionService.adminApproveUpgradeRequest(
        req.params.requestId,
        req.user.id,
        req.body || {}
      );

      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }

  async adminRejectUpgradeRequest(req, res, next) {
    try {
      const data = await subscriptionService.adminRejectUpgradeRequest(
        req.params.requestId,
        req.user.id,
        req.body || {}
      );

      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SubscriptionController();
module.exports.SubscriptionController = SubscriptionController;
