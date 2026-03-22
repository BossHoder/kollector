const Asset = require('../models/Asset');
const logger = require('../config/logger');
const {
  DAY_IN_MS,
  calculateDecayedHealth,
  computeVisualLayersForHealth,
} = require('../modules/gamification/gamification.helpers');

function getMillisecondsUntilNextUtcMidnight(now = new Date()) {
  const nextMidnightUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );

  return Math.max(0, nextMidnightUtc - now.getTime());
}

function buildDecayUpdate(asset, now = new Date()) {
  if (!asset || asset.status !== 'active') {
    return null;
  }

  const newHealth = calculateDecayedHealth(asset.condition?.health ?? 100, asset.category);
  const visualLayers = computeVisualLayersForHealth(newHealth);

  return {
    updateOne: {
      filter: {
        _id: asset._id,
        status: 'active',
      },
      update: {
        $set: {
          'condition.health': newHealth,
          'condition.lastDecayDate': now,
          visualLayers,
        },
      },
    },
  };
}

async function runDailyDecay({
  now = new Date(),
  batchSize = 1000,
} = {}) {
  const cursor = Asset.find({ status: 'active' })
    .select('_id status category condition.health')
    .lean()
    .cursor();
  const operations = [];
  let processed = 0;
  let modified = 0;

  for await (const asset of cursor) {
    const operation = buildDecayUpdate(asset, now);

    if (!operation) {
      continue;
    }

    operations.push(operation);
    processed += 1;

    if (operations.length >= batchSize) {
      const result = await Asset.bulkWrite(operations.splice(0, operations.length), { ordered: false });
      modified += result.modifiedCount || result.nModified || 0;
    }
  }

  if (operations.length > 0) {
    const result = await Asset.bulkWrite(operations, { ordered: false });
    modified += result.modifiedCount || result.nModified || 0;
  }

  logger.info('Daily asset decay completed', {
    processed,
    modified,
    runAt: now.toISOString(),
  });

  return {
    processed,
    modified,
  };
}

function startDecayScheduler({
  nowFn = () => new Date(),
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {}) {
  let nextRunTimeout = null;
  let recurringInterval = null;

  const executeDecay = async () => {
    try {
      await runDailyDecay({ now: nowFn() });
    } catch (error) {
      logger.error('Daily asset decay failed', {
        error: error.message,
      });
    }
  };

  const scheduleRecurringRun = () => {
    recurringInterval = setIntervalFn(() => {
      void executeDecay();
    }, DAY_IN_MS);
  };

  nextRunTimeout = setTimeoutFn(async () => {
    await executeDecay();
    scheduleRecurringRun();
  }, getMillisecondsUntilNextUtcMidnight(nowFn()));

  return {
    runNow: executeDecay,
    stop() {
      if (nextRunTimeout) {
        clearTimeoutFn(nextRunTimeout);
        nextRunTimeout = null;
      }

      if (recurringInterval) {
        clearIntervalFn(recurringInterval);
        recurringInterval = null;
      }
    },
  };
}

module.exports = {
  buildDecayUpdate,
  getMillisecondsUntilNextUtcMidnight,
  runDailyDecay,
  startDecayScheduler,
};
