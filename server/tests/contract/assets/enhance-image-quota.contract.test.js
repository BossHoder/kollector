const request = require('supertest');
const { app } = require('../../../src/app');
const Asset = require('../../../src/models/Asset');
const MonthlyUsageCounter = require('../../../src/models/MonthlyUsageCounter');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');
const { currentUtcMonthKey, nextUtcMonthIso } = require('../../../src/modules/subscription/quota.service');

describe('POST /api/assets/:id/enhance-image processing quota contract', () => {
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
    await Subscription.deleteMany({});
    await User.deleteMany({});

    const auth = await authService.register('enhance-quota@example.com', 'TestPass123');
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

  it('returns 429 with PROCESSING_QUOTA_REACHED details when free user is at the monthly limit', async () => {
    const response = await request(app)
      .post(`/api/assets/${assetId}/enhance-image`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(429);

    expect(response.body).toHaveProperty('error.code', 'PROCESSING_QUOTA_REACHED');
    expect(response.body.error.details).toMatchObject({
      tier: 'free',
      limitType: 'processing',
      used: 20,
      limit: 20,
      nextResetAt: nextUtcMonthIso(),
    });
  });
});
