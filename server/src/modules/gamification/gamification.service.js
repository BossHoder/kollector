const Asset = require('../../models/Asset');
const User = require('../../models/User');
const logger = require('../../config/logger');
const {
  MAINTENANCE_XP,
  buildMaintenanceLog,
  calculateMaintenanceXpAward,
  calculateNextMaintenanceStreak,
  calculateRestoreAmount,
  computeVisualLayersForHealth,
  deriveUnlockedBadges,
  isSameUtcDay,
  roundHealth,
} = require('./gamification.helpers');
const subscriptionService = require('../subscription/subscription.service');

function createHttpError(statusCode, code, message, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;

  if (details) {
    error.details = details;
  }

  return error;
}

class GamificationService {
  async maintainAsset({
    assetId,
    userId,
    version,
    cleanedPercentage,
    durationMs,
    now = new Date(),
  }) {
    const requestedCleanedPercentage = Number(cleanedPercentage);
    const requestedDurationMs = durationMs == null ? null : Number(durationMs);

    if (requestedCleanedPercentage < 80) {
      throw createHttpError(
        400,
        'CLEAN_THRESHOLD_NOT_MET',
        'cleanedPercentage must be at least 80'
      );
    }

    if (requestedDurationMs !== null && requestedDurationMs < 2000) {
      throw createHttpError(
        400,
        'DURATION_TOO_SHORT',
        'Maintenance gestures must last at least 2000ms'
      );
    }

    const asset = await Asset.findById(assetId).lean();

    if (!asset) {
      throw createHttpError(404, 'NOT_FOUND', 'Asset not found');
    }

    if (String(asset.userId) !== String(userId)) {
      throw createHttpError(403, 'FORBIDDEN', 'You do not own this asset');
    }

    if (asset.status !== 'active') {
      throw createHttpError(404, 'NOT_FOUND', 'Asset is not active');
    }

    const previousHealth = Number(asset.condition?.health ?? 100);

    if (previousHealth >= 80) {
      throw createHttpError(
        400,
        'MAINTENANCE_NOT_REQUIRED',
        'Maintenance is only available for assets below 80 health'
      );
    }

    if (Number(version) !== Number(asset.version ?? 1)) {
      throw createHttpError(
        409,
        'VERSION_CONFLICT',
        'Asset version does not match the current document version'
      );
    }

    if (isSameUtcDay(asset.condition?.lastMaintenanceDate, now)) {
      throw createHttpError(
        429,
        'MAINTENANCE_COOLDOWN',
        'Đã bảo trì tài sản này hôm nay. Vui lòng thử lại vào ngày mai.'
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      throw createHttpError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const nextStreakDays = calculateNextMaintenanceStreak(
      user.gamification?.maintenanceStreak ?? 0,
      user.gamification?.lastMaintenanceDate,
      now
    );
    const expMultiplier = await subscriptionService.getMaintenanceExpMultiplier(userId);
    const xpAwarded = calculateMaintenanceXpAward(expMultiplier, MAINTENANCE_XP);
    const restoreAmount = calculateRestoreAmount(nextStreakDays);
    const newHealth = roundHealth(Math.min(100, previousHealth + restoreAmount));
    const visualLayers = computeVisualLayersForHealth(newHealth);
    const maintenanceLog = buildMaintenanceLog({
      previousHealth,
      newHealth,
      xpAwarded,
      expMultiplier,
      xpDelta: xpAwarded,
      date: now,
    });

    const updatedAsset = await Asset.findOneAndUpdate(
      {
        _id: assetId,
        userId,
        status: 'active',
        version: Number(version),
      },
      {
        $set: {
          'condition.health': newHealth,
          'condition.lastMaintenanceDate': now,
          visualLayers,
        },
        $inc: {
          'condition.maintenanceCount': 1,
          version: 1,
        },
        $push: {
          maintenanceLogs: {
            $each: [maintenanceLog],
            $slice: -50,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updatedAsset) {
      throw createHttpError(
        409,
        'VERSION_CONFLICT',
        'The asset changed before maintenance could be persisted'
      );
    }

    const activeAssets = await Asset.find({
      userId,
      status: 'active',
    })
      .select('condition.health')
      .lean();

    const nextMaintenanceCount = Number(asset.condition?.maintenanceCount ?? 0) + 1;
    const existingBadges = user.gamification?.badges || [];
    const badgesUnlocked = deriveUnlockedBadges({
      existingBadges,
      maintenanceCount: nextMaintenanceCount,
      streakDays: nextStreakDays,
      activeAssets,
    });

    user.gamification.totalXp = Number(user.gamification?.totalXp ?? 0) + xpAwarded;
    user.gamification.maintenanceStreak = nextStreakDays;
    user.gamification.lastMaintenanceDate = now;
    user.gamification.badges = [...new Set([...existingBadges, ...badgesUnlocked])];
    user.gamification.stats = user.gamification.stats || {};
    user.gamification.stats.totalCleaningsDone = Number(user.gamification.stats.totalCleaningsDone ?? 0) + 1;
    await user.save();

    logger.info('Asset maintained successfully', {
      assetId,
      userId,
      previousHealth,
      newHealth,
      expMultiplier,
      xpAwarded,
      streakDays: nextStreakDays,
      badgesUnlocked,
    });

    return {
      previousHealth: roundHealth(previousHealth),
      newHealth,
      xpAwarded,
      streakDays: nextStreakDays,
      badgesUnlocked,
    };
  }
}

module.exports = new GamificationService();
