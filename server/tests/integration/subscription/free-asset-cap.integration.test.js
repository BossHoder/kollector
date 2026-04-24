const request = require('supertest');
const { app } = require('../../../src/app');
const Asset = require('../../../src/models/Asset');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Free asset-cap integration', () => {
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

    const auth = await authService.register('free-cap@example.com', 'TestPass123');
    accessToken = auth.accessToken;
    userId = auth.user.id;

    await Subscription.create({
      userId,
      tier: 'free',
      status: 'active',
      paymentChannel: 'manual_bank',
    });

    const assets = Array.from({ length: 19 }, (_, index) => ({
      userId,
      category: 'sneaker',
      status: 'active',
      images: {
        original: {
          url: `https://example.com/seed-${index}.jpg`,
        },
      },
    }));

    await Asset.insertMany(assets);
  });

  it('allows the 20th create, blocks the 21st, and preserves read access', async () => {
    await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ category: 'sneaker' })
      .expect(201);

    const blockedResponse = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ category: 'sneaker' })
      .expect(429);

    expect(blockedResponse.body).toHaveProperty('error.code', 'ASSET_LIMIT_REACHED');

    const listResponse = await request(app)
      .get('/api/assets?limit=100')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(listResponse.body.items)).toBe(true);
    expect(listResponse.body.items.length).toBe(20);

    const count = await Asset.countDocuments({ userId });
    expect(count).toBe(20);
  });
});
