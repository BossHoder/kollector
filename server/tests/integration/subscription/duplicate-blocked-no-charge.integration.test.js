const request = require('supertest');
const { app } = require('../../../src/app');
const Asset = require('../../../src/models/Asset');
const MonthlyUsageCounter = require('../../../src/models/MonthlyUsageCounter');
const QuotaLedgerEntry = require('../../../src/models/QuotaLedgerEntry');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');
const { currentUtcMonthKey } = require('../../../src/modules/subscription/quota.service');

describe('Duplicate blocked processing retries', () => {
  let accessToken;
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
    await QuotaLedgerEntry.deleteMany({});
    await Subscription.deleteMany({});
    await User.deleteMany({});

    const auth = await authService.register('duplicate-blocked@example.com', 'TestPass123');
    accessToken = auth.accessToken;
    userId = auth.user.id;

    await Subscription.create({
      userId,
      tier: 'free',
      status: 'active',
      paymentChannel: 'manual_bank',
    });

    await MonthlyUsageCounter.create({
      userId,
      monthKey: currentUtcMonthKey(),
      tierAtWindowStart: 'free',
      allowance: 20,
      reservedCount: 20,
      consumedCount: 20,
      releasedCount: 0,
    });

    const asset = await Asset.create({
      userId,
      category: 'sneaker',
      status: 'active',
      images: {
        original: {
          url: 'https://example.com/original.jpg',
          uploadedAt: new Date(),
        },
      },
    });

    assetId = asset._id.toString();
  });

  it('keeps quota counters unchanged across repeated blocked enhancement attempts', async () => {
    await request(app)
      .post(`/api/assets/${assetId}/enhance-image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(429);

    await request(app)
      .post(`/api/assets/${assetId}/enhance-image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(429);

    const counter = await MonthlyUsageCounter.findOne({
      userId,
      monthKey: currentUtcMonthKey(),
    }).lean();

    expect(counter).toMatchObject({
      reservedCount: 20,
      consumedCount: 20,
      releasedCount: 0,
    });

    const blockedEntries = await QuotaLedgerEntry.find({
      userId,
      state: 'blocked',
      actionType: 'enhance_image',
    }).lean();

    expect(blockedEntries).toHaveLength(2);
  });
});
