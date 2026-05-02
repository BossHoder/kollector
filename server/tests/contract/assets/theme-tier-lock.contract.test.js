const request = require('supertest');
const { app } = require('../../../src/app');
const Asset = require('../../../src/models/Asset');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('PATCH /api/assets/:id theme tier lock contract', () => {
  let accessToken;
  let userId;
  let assetId;

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

    const auth = await authService.register('theme-tier-lock@example.com', 'TestPass123');
    accessToken = auth.accessToken;
    userId = auth.user.id;

    await Subscription.create({
      userId,
      tier: 'free',
      status: 'active',
      paymentChannel: 'manual_bank',
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

  it('returns THEME_TIER_LOCKED for VIP-only theme applies by Free users', async () => {
    const response = await request(app)
      .patch(`/api/assets/${assetId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        presentation: {
          themeOverrideId: 'museum-forest',
        },
      })
      .expect(403);

    expect(response.body.error).toMatchObject({
      code: 'THEME_TIER_LOCKED',
      details: {
        tier: 'free',
        lockedPresetId: 'museum-forest',
      },
    });
  });
});
