const request = require('supertest');
const { app } = require('../../../src/app');
const Subscription = require('../../../src/models/Subscription');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

jest.setTimeout(30000);

describe('PATCH /api/auth/me asset theme', () => {
  let accessToken;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Subscription.deleteMany({});
    await User.deleteMany({});
    const authResult = await authService.register('me-theme@example.com', 'TestPass123');
    accessToken = authResult.accessToken;

    await Subscription.create({
      userId: authResult.user.id,
      tier: 'vip',
      status: 'active',
      paymentChannel: 'manual_bank',
    });
  });

  it('persists a valid settings.preferences.assetTheme.defaultThemeId', async () => {
    const response = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        settings: {
          preferences: {
            assetTheme: {
              defaultThemeId: 'archive-cobalt',
            },
          },
        },
      })
      .expect(200);

    expect(response.body.settings.preferences.assetTheme.defaultThemeId).toBe('archive-cobalt');
  });

  it('clears the default theme when null is sent', async () => {
    await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        settings: {
          preferences: {
            assetTheme: {
              defaultThemeId: 'archive-cobalt',
            },
          },
        },
      })
      .expect(200);

    const response = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        settings: {
          preferences: {
            assetTheme: {
              defaultThemeId: null,
            },
          },
        },
      })
      .expect(200);

    expect(response.body.settings.preferences.assetTheme.defaultThemeId).toBeNull();
  });

  it('rejects unknown preset ids', async () => {
    const response = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        settings: {
          preferences: {
            assetTheme: {
              defaultThemeId: 'missing-theme',
            },
          },
        },
      })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_THEME_PRESET');
  });
});
