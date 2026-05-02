const { uploadImage } = require('../../config/cloudinary');
const subscriptionService = require('./subscription.service');

function buildValidationError(message, details = {}) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.details = details;
  return error;
}

async function buildProofMetadataFromUpload(file) {
  if (!file) {
    throw buildValidationError('proofFile is required', {
      field: 'proofFile',
    });
  }

  const upload = await uploadImage(file.buffer, {
    folder: 'subscription-proofs',
    originalFilename: file.originalname,
    mimetype: file.mimetype,
  });

  return {
    storageUrl: upload.url,
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
        proofFile: await buildProofMetadataFromUpload(req.file),
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
