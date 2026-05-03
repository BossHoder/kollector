const User = require('../../models/User');
const Subscription = require('../../models/Subscription');
const repository = require('../subscription/subscription.repository');
const subscriptionService = require('../subscription/subscription.service');
const assetController = require('../assets/assets.controller');
const { getQueueMetrics, listFailedJobs } = require('../assets/assets.queue');
const {
  getEnhancementQueueMetrics,
  listEnhancementFailedJobs,
} = require('../assets/assets.enhancement.queue');

function buildError(status, code, message, details = {}) {
  const error = new Error(message);
  error.statusCode = status;
  error.code = code;
  error.details = details;
  return error;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mapUserIdentity(user) {
  return {
    id: String(user._id),
    email: user.email,
    role: user.role || 'user',
    status: user.status,
    displayName: user.profile?.displayName || null,
    avatarUrl: user.profile?.avatarUrl || null,
    createdAt: user.createdAt?.toISOString?.() || null,
    lastLoginAt: user.lastLoginAt?.toISOString?.() || null,
  };
}

function mapRecentUpgradeRequest(request) {
  return {
    id: String(request._id),
    type: request.type,
    status: request.status,
    transferReference: request.transferReference,
    submittedAt: request.submittedAt?.toISOString() || null,
    reviewedAt: request.reviewedAt?.toISOString() || null,
    reviewedBy: request.reviewedBy ? String(request.reviewedBy) : null,
    rejectionReason: request.rejectionReason || null,
    payment: {
      amount: request.proofMetadata?.amount ?? null,
      currency: request.proofMetadata?.currency ?? null,
      bankLabel: request.proofMetadata?.bankLabel ?? null,
      payerMask: request.proofMetadata?.payerMask ?? null,
    },
  };
}

async function buildQueueStatusSnapshot() {
  const [aiProcessing, assetEnhancement] = await Promise.all([
    getQueueMetrics(),
    getEnhancementQueueMetrics(),
  ]);

  return {
    aiProcessing,
    assetEnhancement,
    enhancementAck: assetController.getEnhancementAckMetrics(),
  };
}

class AdminService {
  async getOverview() {
    const [pendingVipRequests, activeVipUsers, queueStatus] = await Promise.all([
      repository.listUpgradeRequests({ status: 'pending' }).then((items) => items.length),
      Subscription.countDocuments({
        tier: 'vip',
        status: { $in: ['active', 'grace_pending_renewal'] },
      }),
      buildQueueStatusSnapshot(),
    ]);

    return {
      pendingVipRequests,
      activeVipUsers,
      queue: {
        waiting: queueStatus.aiProcessing.waiting + queueStatus.assetEnhancement.waiting,
        active: queueStatus.aiProcessing.active + queueStatus.assetEnhancement.active,
      },
      failedJobsCount: queueStatus.aiProcessing.failed + queueStatus.assetEnhancement.failed,
      lastRefreshedAt: new Date().toISOString(),
    };
  }

  async listUsers(filters = {}) {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const query = {};
    const term = String(filters.email || '').trim();

    if (term) {
      query.email = { $regex: escapeRegex(term), $options: 'i' };
    }

    if (filters.role && ['user', 'admin'].includes(filters.role)) {
      query.role = filters.role;
    }

    if (filters.accountStatus && ['active', 'suspended', 'deleted'].includes(filters.accountStatus)) {
      query.status = filters.accountStatus;
    }

    const subscriptionQuery = {};

    if (filters.tier && ['free', 'vip', 'none'].includes(filters.tier) && filters.tier !== 'none') {
      subscriptionQuery.tier = filters.tier;
    }

    if (
      filters.subscriptionStatus
      && ['active', 'grace_pending_renewal', 'expired', 'none'].includes(filters.subscriptionStatus)
      && filters.subscriptionStatus !== 'none'
    ) {
      subscriptionQuery.status = filters.subscriptionStatus;
    }

    const needMissingSubscriptionFilter =
      filters.tier === 'none' || filters.subscriptionStatus === 'none';
    const needSubscriptionFilter =
      needMissingSubscriptionFilter || Object.keys(subscriptionQuery).length > 0;

    if (needSubscriptionFilter) {
      const matchedSubscriptions = await Subscription.find(subscriptionQuery)
        .select('userId')
        .lean();
      const matchedUserIds = matchedSubscriptions.map((subscription) => subscription.userId);

      query._id = needMissingSubscriptionFilter
        ? { $nin: matchedUserIds }
        : { $in: matchedUserIds };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ lastLoginAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    const subscriptions = await Subscription.find({
      userId: { $in: users.map((user) => user._id) },
    })
      .select('userId tier status expiresAt graceEndsAt')
      .lean();

    const subscriptionByUserId = new Map(
      subscriptions.map((subscription) => [String(subscription.userId), subscription])
    );

    const items = users.map((user) => {
      const subscription = subscriptionByUserId.get(String(user._id));

      return {
        ...mapUserIdentity(user),
        subscription: subscription
          ? {
              tier: subscription.tier,
              status: subscription.status,
              expiresAt: subscription.expiresAt?.toISOString?.() || null,
              graceEndsAt: subscription.graceEndsAt?.toISOString?.() || null,
            }
          : null,
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  }

  async getUserSummary(userId) {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw buildError(404, 'NOT_FOUND', 'Không tìm thấy người dùng');
    }

    const [subscription, recentUpgradeRequests] = await Promise.all([
      subscriptionService.getSubscriptionStatus(userId),
      repository.listUpgradeRequestsByUser(userId),
    ]);

    return {
      user: {
        ...mapUserIdentity(user),
        gamification: user.gamification || null,
      },
      subscription,
      recentUpgradeRequests: recentUpgradeRequests.slice(0, 5).map(mapRecentUpgradeRequest),
    };
  }

  async getOperationsQueueStatus() {
    return {
      ...(await buildQueueStatusSnapshot()),
      lastRefreshedAt: new Date().toISOString(),
    };
  }

  async listFailedJobs(limit = 20) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const [aiFailures, enhancementFailures] = await Promise.all([
      listFailedJobs(safeLimit),
      listEnhancementFailedJobs(safeLimit),
    ]);

    return [...aiFailures, ...enhancementFailures]
      .sort((left, right) => {
        const leftTime = left.failedAt ? new Date(left.failedAt).getTime() : 0;
        const rightTime = right.failedAt ? new Date(right.failedAt).getTime() : 0;
        return rightTime - leftTime;
      })
      .slice(0, safeLimit);
  }
}

module.exports = new AdminService();
module.exports.AdminService = AdminService;
