const mongoose = require('mongoose');
const MonthlyUsageCounter = require('../../models/MonthlyUsageCounter');
const QuotaAuditLog = require('../../models/QuotaAuditLog');
const QuotaLedgerEntry = require('../../models/QuotaLedgerEntry');
const Subscription = require('../../models/Subscription');
const SubscriptionUpgradeRequest = require('../../models/SubscriptionUpgradeRequest');
const TierAuditLog = require('../../models/TierAuditLog');

function toObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  return value;
}

class SubscriptionRepository {
  async findSubscriptionByUserId(userId) {
    return Subscription.findOne({ userId: toObjectId(userId) });
  }

  async createDefaultSubscription(userId, defaults = {}) {
    return Subscription.create({
      userId: toObjectId(userId),
      ...defaults,
    });
  }

  async upsertSubscription(userId, update) {
    return Subscription.findOneAndUpdate(
      { userId: toObjectId(userId) },
      update,
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  async createUpgradeRequest(payload) {
    return SubscriptionUpgradeRequest.create({
      ...payload,
      userId: toObjectId(payload.userId),
      reviewedBy: payload.reviewedBy ? toObjectId(payload.reviewedBy) : null,
    });
  }

  async listUpgradeRequestsByUser(userId) {
    return SubscriptionUpgradeRequest.find({ userId: toObjectId(userId) }).sort({ createdAt: -1 });
  }

  async listUpgradeRequests(filters = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    return SubscriptionUpgradeRequest.find(query).sort({ createdAt: -1 });
  }

  async findUpgradeRequestById(requestId) {
    return SubscriptionUpgradeRequest.findById(requestId);
  }

  async findUpgradeRequestByIdForUser(requestId, userId) {
    return SubscriptionUpgradeRequest.findOne({
      _id: requestId,
      userId: toObjectId(userId),
    });
  }

  async markUpgradeRequestReviewed(requestId, reviewUpdate) {
    return SubscriptionUpgradeRequest.findOneAndUpdate(
      {
        _id: requestId,
        status: 'pending',
      },
      {
        $set: reviewUpdate,
      },
      {
        new: true,
      }
    );
  }

  async findOrCreateMonthlyUsageCounter({ userId, monthKey, tierAtWindowStart, allowance }) {
    return MonthlyUsageCounter.findOneAndUpdate(
      {
        userId: toObjectId(userId),
        monthKey,
      },
      {
        $setOnInsert: {
          userId: toObjectId(userId),
          monthKey,
          tierAtWindowStart,
          allowance,
          reservedCount: 0,
          consumedCount: 0,
          releasedCount: 0,
        },
      },
      {
        new: true,
        upsert: true,
      }
    );
  }

  async findMonthlyUsageCounter({ userId, monthKey }) {
    return MonthlyUsageCounter.findOne({
      userId: toObjectId(userId),
      monthKey,
    });
  }

  async reserveMonthlyUsageCounter(userId, monthKey) {
    return MonthlyUsageCounter.findOneAndUpdate(
      {
        userId: toObjectId(userId),
        monthKey,
        $expr: {
          $lt: [
            {
              $subtract: ['$reservedCount', '$releasedCount'],
            },
            '$allowance',
          ],
        },
      },
      {
        $inc: {
          reservedCount: 1,
        },
      },
      {
        new: true,
      }
    );
  }

  async incrementMonthlyUsageCounter(userId, monthKey, increments = {}) {
    return MonthlyUsageCounter.findOneAndUpdate(
      {
        userId: toObjectId(userId),
        monthKey,
      },
      {
        $inc: increments,
      },
      {
        new: true,
      }
    );
  }

  async updateMonthlyUsageCounter(userId, monthKey, update) {
    return MonthlyUsageCounter.findOneAndUpdate(
      {
        userId: toObjectId(userId),
        monthKey,
      },
      update,
      {
        new: true,
      }
    );
  }

  async findQuotaLedgerEntryByKey(idempotencyKey) {
    return QuotaLedgerEntry.findOne({ idempotencyKey });
  }

  async createQuotaLedgerEntry(payload) {
    return QuotaLedgerEntry.create({
      ...payload,
      userId: toObjectId(payload.userId),
      resourceId: payload.resourceId ? toObjectId(payload.resourceId) : null,
    });
  }

  async updateQuotaLedgerEntry(idempotencyKey, update) {
    return QuotaLedgerEntry.findOneAndUpdate(
      { idempotencyKey },
      update,
      { new: true }
    );
  }

  async updateQuotaLedgerEntryForState(idempotencyKey, expectedState, update) {
    return QuotaLedgerEntry.findOneAndUpdate(
      {
        idempotencyKey,
        state: expectedState,
      },
      update,
      {
        new: true,
      }
    );
  }

  async createTierAuditLog(payload) {
    return TierAuditLog.create({
      ...payload,
      userId: toObjectId(payload.userId),
      actorId: toObjectId(payload.actorId),
    });
  }

  async createQuotaAuditLog(payload) {
    return QuotaAuditLog.create({
      ...payload,
      userId: toObjectId(payload.userId),
    });
  }
}

module.exports = new SubscriptionRepository();
module.exports.SubscriptionRepository = SubscriptionRepository;
