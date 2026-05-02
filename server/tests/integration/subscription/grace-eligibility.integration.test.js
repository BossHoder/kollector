const Subscription = require('../../../src/models/Subscription');
const SubscriptionUpgradeRequest = require('../../../src/models/SubscriptionUpgradeRequest');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { runMaintenanceTick } = require('../../../src/workers/subscription-maintenance.worker');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Subscription grace eligibility integration', () => {
  let userId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await SubscriptionUpgradeRequest.deleteMany({});
    await Subscription.deleteMany({});
    await User.deleteMany({});

    const auth = await authService.register('grace-eligible@example.com', 'TestPass123');
    userId = auth.user.id;
  });

  it('keeps VIP active in grace when renewal was submitted before expiry', async () => {
    const expiresAt = new Date('2026-05-01T00:00:00.000Z');
    const now = new Date('2026-05-01T00:05:00.000Z');

    await Subscription.create({
      userId,
      tier: 'vip',
      status: 'active',
      paymentChannel: 'manual_bank',
      activatedAt: new Date('2026-04-01T00:00:00.000Z'),
      expiresAt,
    });

    await SubscriptionUpgradeRequest.create({
      userId,
      type: 'renewal',
      status: 'pending',
      transferReference: 'RENEW-BEFORE-EXPIRY',
      submittedAt: new Date('2026-04-30T23:00:00.000Z'),
      metadataExpireAt: new Date('2026-10-28T00:00:00.000Z'),
      proofFile: {
        storageUrl: 'https://example.com/proof.png',
        uploadedAt: new Date('2026-04-30T23:00:00.000Z'),
        deleteAt: new Date('2026-05-30T23:00:00.000Z'),
      },
    });

    await runMaintenanceTick({
      now,
      listRequests: async () => [],
    });

    const subscription = await Subscription.findOne({ userId }).lean();

    expect(subscription).toMatchObject({
      tier: 'vip',
      status: 'grace_pending_renewal',
    });
    expect(subscription.graceEndsAt.toISOString()).toBe('2026-05-04T00:00:00.000Z');
  });
});
