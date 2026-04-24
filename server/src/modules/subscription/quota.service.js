const {
  buildSubscriptionQuotaUpdatedEvent,
  emitSubscriptionQuotaUpdated,
} = require('./subscription.events');
const { QUOTA_OUTCOMES } = require('./subscription.constants');
const repository = require('./subscription.repository');

function currentUtcMonthKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function nextUtcMonthIso(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  ).toISOString();
}

function nextUtcMonthIsoForMonthKey(monthKey) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(monthKey || ''));

  if (!match) {
    return nextUtcMonthIso();
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0)).toISOString();
}

function getCounterKey(userId, monthKey) {
  return `${String(userId)}:${monthKey}`;
}

function buildCounterShape({ userId, monthKey, allowance = 20, tier = 'free' } = {}) {
  return {
    userId: userId ? String(userId) : null,
    monthKey,
    tierAtWindowStart: tier,
    allowance,
    reservedCount: 0,
    consumedCount: 0,
    releasedCount: 0,
    updatedAt: new Date().toISOString(),
  };
}

function buildUsage(counter, options = {}) {
  const resolvedCounter = counter || buildCounterShape(options);
  const allowance = Number(resolvedCounter.allowance || options.allowance || 0);
  const reservedCount = Number(resolvedCounter.reservedCount || 0);
  const consumedCount = Number(resolvedCounter.consumedCount || 0);
  const releasedCount = Number(resolvedCounter.releasedCount || 0);
  const inFlightReserved = Math.max(reservedCount - consumedCount - releasedCount, 0);
  const remaining = Math.max(allowance - consumedCount - inFlightReserved, 0);
  const used = Math.max(consumedCount + inFlightReserved, 0);
  const monthKey = resolvedCounter.monthKey || options.monthKey || currentUtcMonthKey();

  return {
    allowance,
    used,
    remaining,
    inFlightReserved,
    nextResetAt: nextUtcMonthIsoForMonthKey(monthKey),
  };
}

function getOutcomeUsageDelta(outcome) {
  switch (outcome) {
    case QUOTA_OUTCOMES.RESERVED:
    case QUOTA_OUTCOMES.CONSUMED:
      return 1;
    case QUOTA_OUTCOMES.RELEASED:
      return -1;
    default:
      return 0;
  }
}

function inferFailureClass(error) {
  if (error?.failureClass) {
    return error.failureClass;
  }

  if (error?.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return 'business_validation';
  }

  if (error?.code === 'UNSUPPORTED_IMAGE_CONTENT' || error?.code === 'VALIDATION_ERROR') {
    return 'business_validation';
  }

  return 'internal_system';
}

async function recordQuotaOutcome({
  repository: repo,
  userId,
  actionType,
  idempotencyKey,
  outcome,
  usage,
  emitQuotaUpdated,
}) {
  await repo.createQuotaAuditLog({
    userId,
    actionType,
    idempotencyKey,
    usageDelta: getOutcomeUsageDelta(outcome),
    outcome,
    recordedAt: new Date(),
  });

  if (typeof emitQuotaUpdated === 'function') {
    emitQuotaUpdated(
      String(userId),
      buildSubscriptionQuotaUpdatedEvent({
        occurredAt: new Date().toISOString(),
        userId: String(userId),
        actionType,
        idempotencyKey,
        outcome,
        usage,
      })
    );
  }
}

function createInMemoryQuotaService({ ledgerStore, counterStore } = {}) {
  const ledger = ledgerStore || new Map();
  const counters = counterStore || new Map();

  function ensureCounter({ userId, monthKey, allowance = 20, tier = 'free' }) {
    const key = getCounterKey(userId, monthKey);

    if (!counters.has(key)) {
      counters.set(key, buildCounterShape({ userId, monthKey, allowance, tier }));
    }

    return counters.get(key);
  }

  async function reserveQuota(command) {
    const {
      userId,
      actionType,
      idempotencyKey,
      monthKey = currentUtcMonthKey(),
      allowance = 20,
      tier = 'free',
    } = command;

    const existing = ledger.get(idempotencyKey);
    if (existing) {
      return {
        outcome: existing.state,
        idempotentReplay: true,
        usage: buildUsage(ensureCounter({ userId, monthKey, allowance, tier }), {
          monthKey,
          allowance,
          tier,
        }),
      };
    }

    const counter = ensureCounter({ userId, monthKey, allowance, tier });
    const usageBefore = buildUsage(counter, { monthKey, allowance, tier });

    if (usageBefore.remaining <= 0) {
      ledger.set(idempotencyKey, {
        idempotencyKey,
        userId: String(userId),
        actionType,
        monthKey,
        state: QUOTA_OUTCOMES.BLOCKED,
        finalizedAt: new Date().toISOString(),
      });

      return {
        outcome: QUOTA_OUTCOMES.BLOCKED,
        idempotentReplay: false,
        usage: buildUsage(counter, { monthKey, allowance, tier }),
      };
    }

    counter.reservedCount += 1;
    counter.updatedAt = new Date().toISOString();

    ledger.set(idempotencyKey, {
      idempotencyKey,
      userId: String(userId),
      actionType,
      monthKey,
      state: QUOTA_OUTCOMES.RESERVED,
      finalizedAt: null,
    });

    return {
      outcome: QUOTA_OUTCOMES.RESERVED,
      idempotentReplay: false,
      usage: buildUsage(counter, { monthKey, allowance, tier }),
    };
  }

  async function consumeQuota(command) {
    const {
      userId,
      idempotencyKey,
      monthKey = currentUtcMonthKey(),
      allowance = 20,
      tier = 'free',
    } = command;

    const entry = ledger.get(idempotencyKey);
    const counter = ensureCounter({ userId, monthKey, allowance, tier });

    if (!entry) {
      return {
        outcome: QUOTA_OUTCOMES.BLOCKED,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey, allowance, tier }),
      };
    }

    if (entry.state === QUOTA_OUTCOMES.CONSUMED) {
      return {
        outcome: QUOTA_OUTCOMES.CONSUMED,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey, allowance, tier }),
      };
    }

    if (entry.state !== QUOTA_OUTCOMES.RESERVED) {
      return {
        outcome: entry.state,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey, allowance, tier }),
      };
    }

    entry.state = QUOTA_OUTCOMES.CONSUMED;
    entry.finalizedAt = new Date().toISOString();
    counter.consumedCount += 1;
    counter.updatedAt = new Date().toISOString();

    return {
      outcome: QUOTA_OUTCOMES.CONSUMED,
      idempotentReplay: false,
      usage: buildUsage(counter, { monthKey, allowance, tier }),
    };
  }

  async function releaseQuota(command, options = {}) {
    const {
      userId,
      idempotencyKey,
      monthKey = currentUtcMonthKey(),
      allowance = 20,
      tier = 'free',
    } = command;

    const entry = ledger.get(idempotencyKey);
    const counter = ensureCounter({ userId, monthKey, allowance, tier });

    if (!entry) {
      return {
        outcome: QUOTA_OUTCOMES.BLOCKED,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey, allowance, tier }),
      };
    }

    if (entry.state === QUOTA_OUTCOMES.RELEASED) {
      return {
        outcome: QUOTA_OUTCOMES.RELEASED,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey, allowance, tier }),
      };
    }

    if (entry.state !== QUOTA_OUTCOMES.RESERVED) {
      return {
        outcome: entry.state,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey, allowance, tier }),
      };
    }

    entry.state = QUOTA_OUTCOMES.RELEASED;
    entry.failureClass = options.failureClass || 'internal_system';
    entry.finalizedAt = new Date().toISOString();
    counter.releasedCount += 1;
    counter.updatedAt = new Date().toISOString();

    return {
      outcome: QUOTA_OUTCOMES.RELEASED,
      idempotentReplay: false,
      usage: buildUsage(counter, { monthKey, allowance, tier }),
    };
  }

  function getUsageSnapshot(command) {
    const {
      userId,
      monthKey = currentUtcMonthKey(),
      allowance = 20,
      tier = 'free',
    } = command;

    const counter = ensureCounter({ userId, monthKey, allowance, tier });
    return buildUsage(counter, { monthKey, allowance, tier });
  }

  return {
    consumeQuota,
    counters,
    getUsageSnapshot,
    ledger,
    releaseQuota,
    reserveQuota,
  };
}

function createPersistentQuotaService({
  repository: repo = repository,
  emitQuotaUpdated = emitSubscriptionQuotaUpdated,
} = {}) {
  async function resolveCounter(command, options = {}) {
    const {
      userId,
      monthKey = currentUtcMonthKey(),
      allowance = 20,
      tier = 'free',
    } = command;

    if (options.createIfMissing) {
      return repo.findOrCreateMonthlyUsageCounter({
        userId,
        monthKey,
        tierAtWindowStart: tier,
        allowance,
      });
    }

    const counter = await repo.findMonthlyUsageCounter({ userId, monthKey });
    return counter || buildCounterShape({ userId, monthKey, allowance, tier });
  }

  async function reserveQuota(command) {
    const {
      userId,
      actionType,
      resourceId = null,
      idempotencyKey,
      monthKey = currentUtcMonthKey(),
      allowance = 20,
      tier = 'free',
    } = command;

    const existing = await repo.findQuotaLedgerEntryByKey(idempotencyKey);
    if (existing) {
      const existingCounter = await resolveCounter(
        {
          userId,
          monthKey: existing.monthKey || monthKey,
          allowance,
          tier,
        },
        { createIfMissing: false }
      );

      return {
        outcome: existing.state,
        idempotentReplay: true,
        usage: buildUsage(existingCounter, {
          monthKey: existing.monthKey || monthKey,
          allowance,
          tier,
        }),
      };
    }

    await resolveCounter({ userId, monthKey, allowance, tier }, { createIfMissing: true });

    const reservedCounter = await repo.reserveMonthlyUsageCounter(userId, monthKey);
    if (!reservedCounter) {
      await repo.createQuotaLedgerEntry({
        idempotencyKey,
        userId,
        actionType,
        resourceId,
        monthKey,
        state: QUOTA_OUTCOMES.BLOCKED,
        finalizedAt: new Date(),
      });

      const blockedCounter = await resolveCounter(
        { userId, monthKey, allowance, tier },
        { createIfMissing: false }
      );
      const usage = buildUsage(blockedCounter, { monthKey, allowance, tier });

      await recordQuotaOutcome({
        repository: repo,
        userId,
        actionType,
        idempotencyKey,
        outcome: QUOTA_OUTCOMES.BLOCKED,
        usage,
        emitQuotaUpdated,
      });

      return {
        outcome: QUOTA_OUTCOMES.BLOCKED,
        idempotentReplay: false,
        usage,
      };
    }

    try {
      await repo.createQuotaLedgerEntry({
        idempotencyKey,
        userId,
        actionType,
        resourceId,
        monthKey,
        state: QUOTA_OUTCOMES.RESERVED,
      });
    } catch (error) {
      await repo.incrementMonthlyUsageCounter(userId, monthKey, {
        reservedCount: -1,
      });
      throw error;
    }

    const usage = buildUsage(reservedCounter, { monthKey, allowance, tier });

    await recordQuotaOutcome({
      repository: repo,
      userId,
      actionType,
      idempotencyKey,
      outcome: QUOTA_OUTCOMES.RESERVED,
      usage,
      emitQuotaUpdated,
    });

    return {
      outcome: QUOTA_OUTCOMES.RESERVED,
      idempotentReplay: false,
      usage,
    };
  }

  async function consumeQuota(command) {
    const {
      userId,
      idempotencyKey,
      monthKey = currentUtcMonthKey(),
      allowance = 20,
      tier = 'free',
    } = command;

    const entry = await repo.findQuotaLedgerEntryByKey(idempotencyKey);
    const resolvedMonthKey = entry?.monthKey || monthKey;
    const counter = await resolveCounter(
      { userId, monthKey: resolvedMonthKey, allowance, tier },
      { createIfMissing: false }
    );

    if (!entry) {
      return {
        outcome: QUOTA_OUTCOMES.BLOCKED,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey: resolvedMonthKey, allowance, tier }),
      };
    }

    if (entry.state === QUOTA_OUTCOMES.CONSUMED) {
      return {
        outcome: QUOTA_OUTCOMES.CONSUMED,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey: resolvedMonthKey, allowance, tier }),
      };
    }

    if (entry.state !== QUOTA_OUTCOMES.RESERVED) {
      return {
        outcome: entry.state,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey: resolvedMonthKey, allowance, tier }),
      };
    }

    const updatedEntry = await repo.updateQuotaLedgerEntryForState(idempotencyKey, QUOTA_OUTCOMES.RESERVED, {
      $set: {
        state: QUOTA_OUTCOMES.CONSUMED,
        finalizedAt: new Date(),
      },
    });

    if (!updatedEntry) {
      const latestEntry = await repo.findQuotaLedgerEntryByKey(idempotencyKey);

      return {
        outcome: latestEntry?.state || QUOTA_OUTCOMES.BLOCKED,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey: resolvedMonthKey, allowance, tier }),
      };
    }

    const updatedCounter = await repo.incrementMonthlyUsageCounter(userId, resolvedMonthKey, {
      consumedCount: 1,
    });
    const usage = buildUsage(updatedCounter || counter, {
      monthKey: resolvedMonthKey,
      allowance,
      tier,
    });

    await recordQuotaOutcome({
      repository: repo,
      userId,
      actionType: updatedEntry.actionType,
      idempotencyKey,
      outcome: QUOTA_OUTCOMES.CONSUMED,
      usage,
      emitQuotaUpdated,
    });

    return {
      outcome: QUOTA_OUTCOMES.CONSUMED,
      idempotentReplay: false,
      usage,
    };
  }

  async function releaseQuota(command, options = {}) {
    const {
      userId,
      idempotencyKey,
      monthKey = currentUtcMonthKey(),
      allowance = 20,
      tier = 'free',
    } = command;

    const entry = await repo.findQuotaLedgerEntryByKey(idempotencyKey);
    const resolvedMonthKey = entry?.monthKey || monthKey;
    const counter = await resolveCounter(
      { userId, monthKey: resolvedMonthKey, allowance, tier },
      { createIfMissing: false }
    );

    if (!entry) {
      return {
        outcome: QUOTA_OUTCOMES.BLOCKED,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey: resolvedMonthKey, allowance, tier }),
      };
    }

    if (entry.state === QUOTA_OUTCOMES.RELEASED) {
      return {
        outcome: QUOTA_OUTCOMES.RELEASED,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey: resolvedMonthKey, allowance, tier }),
      };
    }

    if (entry.state !== QUOTA_OUTCOMES.RESERVED) {
      return {
        outcome: entry.state,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey: resolvedMonthKey, allowance, tier }),
      };
    }

    const updatedEntry = await repo.updateQuotaLedgerEntryForState(idempotencyKey, QUOTA_OUTCOMES.RESERVED, {
      $set: {
        state: QUOTA_OUTCOMES.RELEASED,
        failureClass: options.failureClass || 'internal_system',
        finalizedAt: new Date(),
      },
    });

    if (!updatedEntry) {
      const latestEntry = await repo.findQuotaLedgerEntryByKey(idempotencyKey);

      return {
        outcome: latestEntry?.state || QUOTA_OUTCOMES.BLOCKED,
        idempotentReplay: true,
        usage: buildUsage(counter, { monthKey: resolvedMonthKey, allowance, tier }),
      };
    }

    const updatedCounter = await repo.incrementMonthlyUsageCounter(userId, resolvedMonthKey, {
      releasedCount: 1,
    });
    const usage = buildUsage(updatedCounter || counter, {
      monthKey: resolvedMonthKey,
      allowance,
      tier,
    });

    await recordQuotaOutcome({
      repository: repo,
      userId,
      actionType: updatedEntry.actionType,
      idempotencyKey,
      outcome: QUOTA_OUTCOMES.RELEASED,
      usage,
      emitQuotaUpdated,
    });

    return {
      outcome: QUOTA_OUTCOMES.RELEASED,
      idempotentReplay: false,
      usage,
    };
  }

  async function getUsageSnapshot(command) {
    const {
      userId,
      monthKey = currentUtcMonthKey(),
      allowance = 20,
      tier = 'free',
    } = command;

    const counter = await resolveCounter(
      { userId, monthKey, allowance, tier },
      { createIfMissing: false }
    );

    return buildUsage(counter, { monthKey, allowance, tier });
  }

  return {
    consumeQuota,
    getUsageSnapshot,
    releaseQuota,
    reserveQuota,
  };
}

function createQuotaService(options = {}) {
  if (options.repository) {
    return createPersistentQuotaService(options);
  }

  return createInMemoryQuotaService(options);
}

const defaultQuotaService = createQuotaService({ repository });

module.exports = {
  buildUsage,
  createQuotaService,
  currentUtcMonthKey,
  defaultQuotaService,
  getUsageSnapshot: (...args) => defaultQuotaService.getUsageSnapshot(...args),
  getCounterKey,
  inferFailureClass,
  nextUtcMonthIso,
  nextUtcMonthIsoForMonthKey,
  releaseQuota: (...args) => defaultQuotaService.releaseQuota(...args),
  reserveQuota: (...args) => defaultQuotaService.reserveQuota(...args),
  consumeQuota: (...args) => defaultQuotaService.consumeQuota(...args),
};
