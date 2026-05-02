const Subscription = require('../../../src/models/Subscription');
const TierAuditLog = require('../../../src/models/TierAuditLog');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { runMaintenanceTick } = require('../../../src/workers/subscription-maintenance.worker');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Subscription grace elapse downgrade integration', () => {
  let userId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await TierAuditLog.deleteMany({});
    await Subscription.deleteMany({});
    await User.deleteMany({});

    const auth = await authService.register('grace-elapse@example.com', 'TestPass123');
    userId = auth.user.id;
  });

  it('downgrades VIP to Free after the 72-hour grace window elapses', async () => {
    await Subscription.create({
      userId,
      tier: 'vip',
      status: 'grace_pending_renewal',
      paymentChannel: 'manual_bank',
      activatedAt: new Date('2026-04-01T00:00:00.000Z'),
      expiresAt: new Date('2026-05-01T00:00:00.000Z'),
      graceEndsAt: new Date('2026-05-04T00:00:00.000Z'),
    });

    await runMaintenanceTick({
      now: new Date('2026-05-04T00:01:00.000Z'),
      listRequests: async () => [],
    });

    const subscription = await Subscription.findOne({ userId }).lean();
    const auditLog = await TierAuditLog.findOne({ userId }).lean();

    expect(subscription).toMatchObject({
      tier: 'free',
      status: 'active',
    });
    expect(subscription.graceEndsAt).toBeNull();
    expect(auditLog).toMatchObject({
      fromTier: 'vip',
      toTier: 'free',
      reason: 'grace_elapsed',
    });
  });
});
