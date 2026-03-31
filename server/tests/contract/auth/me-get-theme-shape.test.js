const request = require('supertest');
const { app } = require('../../../src/app');
const User = require('../../../src/models/User');
const authService = require('../../../src/modules/auth/auth.service');
const { connectDatabase, disconnectDatabase } = require('../../../src/config/database');

jest.setTimeout(30000);

describe('GET /api/auth/me asset theme shape', () => {
  let accessToken;
  let userId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    const authResult = await authService.register('me-shape@example.com', 'TestPass123');
    accessToken = authResult.accessToken;
    userId = authResult.user.id;
  });

  it('returns assetTheme when present', async () => {
    await User.findByIdAndUpdate(userId, {
      'settings.preferences.assetTheme.defaultThemeId': 'vault-graphite',
    });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.settings.preferences.assetTheme.defaultThemeId).toBe('vault-graphite');
  });

  it('returns assetTheme with null when cleared', async () => {
    await User.findByIdAndUpdate(userId, {
      'settings.preferences.assetTheme.defaultThemeId': null,
    });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.settings.preferences.assetTheme.defaultThemeId).toBeNull();
  });

  it('includes the optional assetTheme object for default users', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.settings.preferences.assetTheme).toEqual({
      defaultThemeId: null,
    });
  });
});
