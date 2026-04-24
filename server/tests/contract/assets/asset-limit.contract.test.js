const request = require('supertest');
const { app } = require('../../../src/app');
const Asset = require('../../../src/models/Asset');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('POST /api/assets asset-cap contract', () => {
  let accessToken;
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

    const auth = await authService.register('asset-cap@example.com', 'TestPass123');
    accessToken = auth.accessToken;
    userId = auth.user.id;

    await Subscription.create({
      userId,
      tier: 'free',
      status: 'active',
      paymentChannel: 'manual_bank',
    });

    const assets = Array.from({ length: 20 }, (_, index) => ({
      userId,
      category: 'sneaker',
      status: 'active',
      images: {
        original: {
          url: `https://example.com/asset-${index}.jpg`,
        },
      },
    }));

    await Asset.insertMany(assets);
  });

  it('returns 429 with ASSET_LIMIT_REACHED details when free user is at cap', async () => {
    const response = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ category: 'sneaker' })
      .expect('Content-Type', /json/)
      .expect(429);

    expect(response.body).toHaveProperty('error.code', 'ASSET_LIMIT_REACHED');
    expect(response.body.error.details).toMatchObject({
      tier: 'free',
      limitType: 'asset',
      used: 20,
      limit: 20,
      nextResetAt: null,
    });
  });
});
