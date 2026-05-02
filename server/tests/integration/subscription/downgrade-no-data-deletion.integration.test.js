const Asset = require('../../../src/models/Asset');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { runMaintenanceTick } = require('../../../src/workers/subscription-maintenance.worker');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Subscription downgrade data safety integration', () => {
  let userId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Asset.deleteMany({});
    await Subscription.deleteMany({});
    await User.deleteMany({});

    const auth = await authService.register('downgrade-data-safe@example.com', 'TestPass123');
    userId = auth.user.id;
  });

  it('does not delete existing assets when VIP downgrades to Free', async () => {
    await Subscription.create({
      userId,
      tier: 'vip',
      status: 'grace_pending_renewal',
      paymentChannel: 'manual_bank',
      expiresAt: new Date('2026-05-01T00:00:00.000Z'),
      graceEndsAt: new Date('2026-05-04T00:00:00.000Z'),
    });

    const asset = await Asset.create({
      userId,
      category: 'sneaker',
      status: 'active',
      presentation: {
        themeOverrideId: 'museum-forest',
      },
      images: {
        original: {
          url: 'https://example.com/original.jpg',
          uploadedAt: new Date(),
        },
      },
    });

    await runMaintenanceTick({
      now: new Date('2026-05-04T01:00:00.000Z'),
      listRequests: async () => [],
    });

    const persistedAsset = await Asset.findById(asset._id).lean();
    expect(persistedAsset).toBeTruthy();
    expect(persistedAsset.presentation.themeOverrideId).toBe('museum-forest');
  });
});
