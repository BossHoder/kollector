const request = require('supertest');
const { app } = require('../../../src/app');
const User = require('../../../src/models/User');
const Asset = require('../../../src/models/Asset');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

jest.setTimeout(30000);

describe('PATCH /api/assets/:id theme override', () => {
  let accessToken;
  let assetId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Asset.deleteMany({});

    const authResult = await authService.register('theme-override@example.com', 'TestPass123');
    accessToken = authResult.accessToken;

    const asset = await Asset.create({
      userId: authResult.user.id,
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

  it('persists a valid presentation.themeOverrideId', async () => {
    const response = await request(app)
      .patch(`/api/assets/${assetId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        presentation: {
          themeOverrideId: 'museum-forest',
        },
      })
      .expect(200);

    expect(response.body.presentation.themeOverrideId).toBe('museum-forest');
  });

  it('clears the theme override when null is sent', async () => {
    await Asset.findByIdAndUpdate(assetId, {
      presentation: {
        themeOverrideId: 'archive-cobalt',
      },
    });

    const response = await request(app)
      .patch(`/api/assets/${assetId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        presentation: {
          themeOverrideId: null,
        },
      })
      .expect(200);

    expect(response.body.presentation.themeOverrideId).toBeNull();
  });

  it('rejects unknown preset ids', async () => {
    const response = await request(app)
      .patch(`/api/assets/${assetId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        presentation: {
          themeOverrideId: 'not-a-real-theme',
        },
      })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_THEME_PRESET');
  });
});
