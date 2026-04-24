const logger = require('../config/logger');

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

    const proofDeleteAt = request?.proofFile?.deleteAt ? new Date(request.proofFile.deleteAt).getTime() : null;
    if (proofDeleteAt !== null && !Number.isNaN(proofDeleteAt) && proofDeleteAt <= nowValue) {
      proofFilePurgeIds.push(requestId);
    }

    const metadataExpireAt = request?.metadataExpireAt ? new Date(request.metadataExpireAt).getTime() : null;
    if (metadataExpireAt !== null && !Number.isNaN(metadataExpireAt) && metadataExpireAt <= nowValue) {
      metadataPurgeIds.push(requestId);
    }
  }

  return {
    proofFilePurgeIds,
    metadataPurgeIds,
  };
}

async function runMaintenanceTick({ now = new Date(), listRequests = async () => [] } = {}) {
  const requests = await listRequests();
  const classification = classifyRetentionCandidates(requests, now);

  logger.debug('Subscription maintenance tick', {
    checked: requests.length,
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
  const listRequests = options.listRequests || (async () => []);

  const timer = setInterval(() => {
    runMaintenanceTick({ listRequests }).catch((error) => {
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
  runMaintenanceTick,
  startSubscriptionMaintenanceWorker,
};
