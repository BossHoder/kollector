require('dotenv').config({ path: require('path').join(__dirname, '../../../.env.test') });

const Asset = require('../../../src/models/Asset');
const MonthlyUsageCounter = require('../../../src/models/MonthlyUsageCounter');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');
const { defaultQuotaService } = require('../../../src/modules/subscription/quota.service');

describe('Monthly processing quota reset rollover', () => {
  let assetId;
  let userId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Asset.deleteMany({});
    await MonthlyUsageCounter.deleteMany({});
    await Subscription.deleteMany({});
    await User.deleteMany({});

    const auth = await authService.register('monthly-rollover@example.com', 'TestPass123');
    userId = auth.user.id;

    await Subscription.create({
      userId,
      tier: 'free',
      status: 'active',
      paymentChannel: 'manual_bank',
    });

    await MonthlyUsageCounter.create({
      userId,
      monthKey: '2026-04',
      tierAtWindowStart: 'free',
      allowance: 20,
      reservedCount: 20,
      consumedCount: 20,
      releasedCount: 0,
      updatedAt: new Date('2026-04-30T23:59:59.000Z'),
    });

    const asset = await Asset.create({
      userId,
      category: 'sneaker',
      status: 'active',
      images: {
        original: {
          url: 'https://example.com/original.jpg',
          uploadedAt: new Date('2026-05-01T00:00:30.000Z'),
        },
      },
    });

    assetId = asset._id.toString();
  });

  it('lazily initializes the new UTC month and allows the first accepted request after rollover', async () => {
    const result = await defaultQuotaService.reserveQuota({
      userId,
      actionType: 'enhance_image',
      resourceId: assetId,
      idempotencyKey: 'rollover-001',
      monthKey: '2026-05',
      allowance: 20,
      tier: 'free',
    });

    const aprilCounter = await MonthlyUsageCounter.findOne({
      userId,
      monthKey: '2026-04',
    }).lean();
    const mayCounter = await MonthlyUsageCounter.findOne({
      userId,
      monthKey: '2026-05',
    }).lean();

    expect(result.outcome).toBe('reserved');
    expect(aprilCounter).toMatchObject({
      reservedCount: 20,
      consumedCount: 20,
      releasedCount: 0,
    });
    expect(mayCounter).toMatchObject({
      allowance: 20,
      reservedCount: 1,
      consumedCount: 0,
      releasedCount: 0,
    });
  });
});
