const request = require('supertest');
const { app } = require('../../../src/app');
const Asset = require('../../../src/models/Asset');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

describe('Theme downgrade visibility integration', () => {
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

    const auth = await authService.register('theme-downgrade-visibility@example.com', 'TestPass123');
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

    assetId = asset._id.toString();
  });

  it('preserves visibility of previously applied VIP themes while blocking new VIP-only applies', async () => {
    const detailResponse = await request(app)
      .get(`/api/assets/${assetId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(detailResponse.body.presentation.themeOverrideId).toBe('museum-forest');
    expect(detailResponse.body.resolvedThemeId).toBe('museum-forest');

    const patchResponse = await request(app)
      .patch(`/api/assets/${assetId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        presentation: {
          themeOverrideId: 'archive-cobalt',
        },
      })
      .expect(403);

    expect(patchResponse.body.error.code).toBe('THEME_TIER_LOCKED');
  });
});
