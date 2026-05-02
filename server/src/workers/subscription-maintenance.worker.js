const logger = require('../config/logger');
const { deleteImage, extractPublicIdFromUrl } = require('../config/cloudinary');
const repository = require('../modules/subscription/subscription.repository');
const subscriptionService = require('../modules/subscription/subscription.service');

const PROOF_RETENTION_DAYS = 30;
const METADATA_RETENTION_DAYS = 180;
const DEFAULT_INTERVAL_MS = 60 * 1000;

let workerHandle = null;

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function computeRetentionDeadlines({ submittedAt, uploadedAt }) {
  const submittedDate = new Date(submittedAt || Date.now());
  const uploadedDate = new Date(uploadedAt || submittedDate);

  return {
    proofFileDeleteAt: addDays(uploadedDate, PROOF_RETENTION_DAYS),
    metadataExpireAt: addDays(submittedDate, METADATA_RETENTION_DAYS),
  };
}

function classifyRetentionCandidates(requests, now = new Date()) {
  const nowValue = now.getTime();
  const proofFilePurgeIds = [];
  const metadataPurgeIds = [];

  for (const request of requests || []) {
    const requestId = String(request.id || request._id);
    if (request?.proofFilePurgedAt && request?.metadataPurgedAt) {
      continue;
    }

    const proofDeleteAt = request?.proofFile?.deleteAt ? new Date(request.proofFile.deleteAt).getTime() : null;
    if (
      proofDeleteAt !== null
      && !Number.isNaN(proofDeleteAt)
      && proofDeleteAt <= nowValue
      && !request?.proofFilePurgedAt
    ) {
      proofFilePurgeIds.push(requestId);
    }

    const metadataExpireAt = request?.metadataExpireAt ? new Date(request.metadataExpireAt).getTime() : null;
    if (
      metadataExpireAt !== null
      && !Number.isNaN(metadataExpireAt)
      && metadataExpireAt <= nowValue
      && !request?.metadataPurgedAt
    ) {
      metadataPurgeIds.push(requestId);
    }
  }

  return {
    proofFilePurgeIds,
    metadataPurgeIds,
  };
}

async function purgeProofFile(request, now = new Date()) {
  const publicId = extractPublicIdFromUrl(request?.proofFile?.storageUrl);

  if (publicId) {
    await deleteImage(publicId);
  }

  return repository.purgeUpgradeRequestProofFile(request._id, now);
}

async function purgeMetadata(request, now = new Date()) {
  return repository.purgeUpgradeRequestMetadata(request._id, now);
}

async function runMaintenanceTick({
  now = new Date(),
  listRequests = (cutoff) => repository.listUpgradeRequestsForRetention(cutoff),
  listSubscriptions = (cutoff) => repository.listSubscriptionsForLifecycleReview(cutoff),
  purgeProofFile: purgeProofFileFn = purgeProofFile,
  purgeMetadata: purgeMetadataFn = purgeMetadata,
} = {}) {
  const requests = await listRequests(now);
  const classification = classifyRetentionCandidates(requests, now);
  const subscriptions = await listSubscriptions(now);

  for (const request of requests) {
    const requestId = String(request._id);

    if (classification.proofFilePurgeIds.includes(requestId)) {
      await purgeProofFileFn(request, now);
    }

    if (classification.metadataPurgeIds.includes(requestId)) {
      await purgeMetadataFn(request, now);
    }
  }

  for (const subscription of subscriptions) {
    await subscriptionService.syncSubscriptionLifecycle(subscription, now);
  }

  logger.debug('Subscription maintenance tick', {
    checked: requests.length,
    lifecycleChecked: subscriptions.length,
    proofFilePurgeCount: classification.proofFilePurgeIds.length,
    metadataPurgeCount: classification.metadataPurgeIds.length,
  });

  return classification;
}

function startSubscriptionMaintenanceWorker(options = {}) {
  if (workerHandle) {
    return workerHandle;
  }

  const intervalMs = options.intervalMs || DEFAULT_INTERVAL_MS;
  const listRequests = options.listRequests || ((cutoff) => repository.listUpgradeRequestsForRetention(cutoff));
  const listSubscriptions =
    options.listSubscriptions || ((cutoff) => repository.listSubscriptionsForLifecycleReview(cutoff));

  const timer = setInterval(() => {
    runMaintenanceTick({ listRequests, listSubscriptions }).catch((error) => {
      logger.error('Subscription maintenance tick failed', {
        error: error.message,
      });
    });
  }, intervalMs);

  workerHandle = {
    async close() {
      clearInterval(timer);
      workerHandle = null;
    },
  };

  return workerHandle;
}

function getSubscriptionMaintenanceWorker() {
  return workerHandle;
}

module.exports = {
  classifyRetentionCandidates,
  computeRetentionDeadlines,
  getSubscriptionMaintenanceWorker,
  purgeMetadata,
  purgeProofFile,
  runMaintenanceTick,
  startSubscriptionMaintenanceWorker,
};
